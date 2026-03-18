use spacetimedb::{reducer, ReducerContext, Table, TimeDuration};
use log::{info, debug, warn};
use std::collections::{HashMap, HashSet};
use crate::enums::EventStatus;
use crate::tables::{event_participant, event, Event, discovery_event, DiscoveryEvent, discovery_rotation_schedule, DiscoveryRotationSchedule};

const MAX_DISCOVERY_SIZE: usize = 6;
const SWAP_INTERVAL_MICROS: i64 = 60 * 1_000_000;
const ELIGIBILITY_LOOKAHEAD_MICROS: i64 = 30 * 60 * 1_000_000;

#[reducer(init)]
pub fn init_discovery_system(ctx: &ReducerContext) {
    for item in ctx.db.discovery_event().iter() { ctx.db.discovery_event().event_id().delete(item.event_id); }
    for item in ctx.db.discovery_rotation_schedule().iter() { ctx.db.discovery_rotation_schedule().scheduled_id().delete(item.scheduled_id); }
    
    populate_initial_discovery(ctx);
    schedule_discovery_rotation(ctx);
    info!("Initialized Discovery System.");
}

fn schedule_discovery_rotation(ctx: &ReducerContext) {
    let rotation_interval = TimeDuration::from_micros(SWAP_INTERVAL_MICROS);
    if ctx.db.discovery_rotation_schedule().iter().count() == 0 {
        ctx.db.discovery_rotation_schedule().insert(DiscoveryRotationSchedule {
            scheduled_id: 0, scheduled_at: rotation_interval.into(),
        });
        info!("Scheduled initial discovery rotation");
    }
}

fn populate_initial_discovery(ctx: &ReducerContext) {
    let now = ctx.timestamp;
    let min_start_time = now + TimeDuration::from_micros(ELIGIBILITY_LOOKAHEAD_MICROS);
    let mut candidates: Vec<Event> = ctx.db.event().iter()
        .filter(|e| e.status == EventStatus::Published && !e.is_internal && e.start_time > min_start_time)  
        .collect();
    candidates.sort_by_key(|e| e.start_time);

    let mut current_priority = 1u64;
    for event in candidates.iter().take(MAX_DISCOVERY_SIZE) {
        ctx.db.discovery_event().insert(DiscoveryEvent {
            event_id: event.event_id, display_priority: current_priority, added_at: now,
        });
        current_priority += 1;
    }
}

// Weighted selection helper local to this module
fn select_weighted_random_index(items_with_weights: &Vec<(u64, u64)>, seed: u64) -> Option<usize> {
    if items_with_weights.is_empty() { return None; }
    let total_weight: u64 = items_with_weights.iter().map(|(_, w)| *w).sum();
    if total_weight == 0 { return None; }
    let random_val = (seed % total_weight).saturating_add(1);
    let mut current_weight_sum = 0u64;
    for (index, (_, weight)) in items_with_weights.iter().enumerate() {
        current_weight_sum = current_weight_sum.saturating_add(*weight);
        if random_val <= current_weight_sum { return Some(index); }
    }
    items_with_weights.len().checked_sub(1)
}

#[reducer]
pub fn rotate_discovery_event(
    ctx: &ReducerContext,
    schedule_info: DiscoveryRotationSchedule,
) -> Result<(), String> {
    debug!("Running discovery rotation (Schedule ID: {})...", schedule_info.scheduled_id);
    let now = ctx.timestamp; // now is spacetimedb::Timestamp

    // --- 1. Cleanup ---
    let mut needs_re_prioritize = false;
    let discovery_item_ids: Vec<u64> = ctx.db.discovery_event().iter().map(|item| item.event_id).collect();

    for event_id in discovery_item_ids {
        if let Some(item) = ctx.db.discovery_event().event_id().find(event_id) {
            let event_is_valid = match ctx.db.event().event_id().find(item.event_id) {
                Some(event) => event.status == EventStatus::Published && !event.is_internal && event.start_time >= now,
                None => false,
            };

            if !event_is_valid || item.display_priority == 0 {
                debug!("Cleaning up Discovery Event ID: {} (Priority: {}) due to invalid status/time/priority.", item.event_id, item.display_priority);
                ctx.db.discovery_event().event_id().delete(item.event_id);
                needs_re_prioritize = true;
            }
        }
    }

    // --- 2. Re-Prioritize Existing Events ---
    let mut current_discovery_events: Vec<DiscoveryEvent> = ctx.db.discovery_event().iter().collect();
    // Always re-prioritize after cleanup if any changes occurred, or even if not,
    // to ensure priorities are sequential.
    if !current_discovery_events.is_empty() {
        // Sort by the existing priority first to maintain relative order if possible,
        // although assigning purely sequential might be simpler. Let's sort just in case.
        current_discovery_events.sort_by_key(|e| e.display_priority);
        let mut new_priority = 1u64;
        // Collect IDs to update to avoid borrowing issues if we iterated directly
        let events_to_update_ids: Vec<u64> = current_discovery_events.iter().map(|e| e.event_id).collect();

        debug!("Re-prioritizing {} remaining discovery events...", events_to_update_ids.len());
        for event_id in events_to_update_ids {
             // Fetch the latest version of the entry
             if let Some(mut event_entry) = ctx.db.discovery_event().event_id().find(event_id) {
                 if event_entry.display_priority != new_priority {
                    debug!("Updating priority for Event ID {}: {} -> {}", event_entry.event_id, event_entry.display_priority, new_priority);
                    event_entry.display_priority = new_priority;
                    ctx.db.discovery_event().event_id().update(event_entry);
                 }
                 new_priority += 1;
             } else {
                 warn!("Event ID {} disappeared during re-prioritization?", event_id);
             }
        }
        // Re-fetch after updates to get the correctly prioritized list
        current_discovery_events = ctx.db.discovery_event().iter().collect();
        current_discovery_events.sort_by_key(|e| e.display_priority); // Sort by the new priority
    }

    // --- 3. Fill Empty Slots up to MAX_DISCOVERY_SIZE ---
    let current_count = current_discovery_events.len();
    let needed = MAX_DISCOVERY_SIZE.saturating_sub(current_count);

    if needed > 0 {
        debug!("Discovery list has {} items, need to fill {} slots.", current_count, needed);

        // Find eligible events that are not already in the discovery list
        let current_discovery_ids: HashSet<u64> = current_discovery_events.iter().map(|e| e.event_id).collect();
        let min_start_time = now + TimeDuration::from_micros(ELIGIBILITY_LOOKAHEAD_MICROS);

        let mut potential_candidates: Vec<Event> = ctx.db.event().iter()
            .filter(|e|
                e.status == EventStatus::Published &&
                !e.is_internal &&
                e.start_time > min_start_time &&
                !current_discovery_ids.contains(&e.event_id) // Exclude already present
            )
            .collect();

        // Sort candidates (e.g., by start time, earliest first)
        potential_candidates.sort_by_key(|e| e.start_time);

        // Take the top 'needed' candidates and add them
        let mut current_priority_to_assign = (current_count as u64) + 1;
        let mut added_count = 0;
        for candidate in potential_candidates.iter().take(needed) {
            debug!("Adding Event ID {} with priority {} to fill discovery.", candidate.event_id, current_priority_to_assign);
            let new_entry = DiscoveryEvent {
                event_id: candidate.event_id,
                display_priority: current_priority_to_assign,
                added_at: now,
            };
            ctx.db.discovery_event().insert(new_entry);
            current_priority_to_assign += 1;
            added_count += 1;
        }
        info!("Added {} new events to fill discovery list.", added_count);

        // Re-fetch the complete list after filling
        current_discovery_events = ctx.db.discovery_event().iter().collect();
        current_discovery_events.sort_by_key(|e| e.display_priority); // Ensure sorted for next step
    } else {
        debug!("Discovery list is full ({} items). No filling needed.", current_count);
    }

    let current_discovery_size = current_discovery_events.len();

    // --- 3. Select Swap Out ---
    let top_n_count = std::cmp::min(current_discovery_size, MAX_DISCOVERY_SIZE);
    let swap_out_candidates: Vec<(u64, u64)> = current_discovery_events
        .iter()
        .take(top_n_count)
        .map(|entry| {
             let weight = (top_n_count as u64 + 1).saturating_sub(entry.display_priority);
             (entry.event_id, std::cmp::max(1, weight))
        })
        .collect();

     debug!("Swap-out candidates (EventID, Weight): {:?}", swap_out_candidates);

    let swap_out_index_opt = select_weighted_random_index(&swap_out_candidates, schedule_info.scheduled_id);

    let swap_out_entry = match swap_out_index_opt {
         Some(index) => {
             current_discovery_events.get(index).cloned().ok_or_else(|| {
                format!("Internal error: Invalid index {} selected for swap out (top_n_count: {}, current_size: {}).", index, top_n_count, current_discovery_size)
            })?
         }
         None => {
             warn!("Could not select an event to swap out ({} candidates). Skipping rotation.", swap_out_candidates.len());
             return Ok(());
         }
    };

    let swap_out_event_id = swap_out_entry.event_id;
    let swap_out_priority = swap_out_entry.display_priority;
    debug!("Selected Event ID {} (Priority {}) to potentially swap out.", swap_out_event_id, swap_out_priority);


    // --- 4. Select Replacement ---
    let mut group_participant_counts: HashMap<u64, u64> = HashMap::new();
    for p in ctx.db.event_participant().iter() {
        *group_participant_counts.entry(p.event_id).or_insert(0) += 1;
    }

    let min_start_time_for_candidate = now + TimeDuration::from_micros(ELIGIBILITY_LOOKAHEAD_MICROS);

    let all_eligible_events: Vec<Event> = ctx.db.event().iter()
        .filter(|e| e.status == EventStatus::Published && !e.is_internal && e.start_time > min_start_time_for_candidate)
        .collect();

    let current_discovery_ids: HashSet<u64> = current_discovery_events.iter().map(|de| de.event_id).collect();

    let replacement_pool: Vec<&Event> = all_eligible_events.iter()
        .filter(|e| !current_discovery_ids.contains(&e.event_id) || e.event_id == swap_out_event_id)
        .collect();

    debug!("Found {} potential replacement candidates.", replacement_pool.len());

    if replacement_pool.is_empty() {
        warn!("No replacement candidates found. Skipping swap.");
        return Ok(());
    }

    let replacement_candidates_with_weights: Vec<(u64, u64)> = replacement_pool
        .iter()
        .map(|&event| { // event is type Event
            let participant_count = group_participant_counts.get(&event.event_id).cloned().unwrap_or(0);

            let now_micros = now.to_micros_since_unix_epoch();
            let created_at_micros = event.created_at.to_micros_since_unix_epoch();

            let age_micros = now_micros - created_at_micros;

            let age_seconds = if age_micros < 0 {
                 warn!("Calculated negative age_micros {} for event {}. Using 0.", age_micros, event.event_id);
                 0u64
             } else {
                 (age_micros / 1_000_000) as u64
             };

            let weight_participants = 1000 / (participant_count + 1);
            let weight_age = age_seconds;

            let combined_weight = (weight_participants * 2).saturating_add(weight_age);
            (event.event_id, std::cmp::max(1, combined_weight))
        })
        .collect();

    debug!("Replacement candidates with weights (EventID, Weight): {:?}", replacement_candidates_with_weights);

    // Corrected: Use to_micros_since_unix_epoch()
    let timestamp_micros = now.to_micros_since_unix_epoch(); // Returns i64
    let timestamp_seed_part = if timestamp_micros < 0 { 0u64 } else { timestamp_micros as u64 };
    let replacement_seed = schedule_info.scheduled_id.wrapping_add(timestamp_seed_part);

    let replacement_index_opt = select_weighted_random_index(&replacement_candidates_with_weights, replacement_seed);

    let replacement_event_id = match replacement_index_opt {
        Some(index) => {
            replacement_pool.get(index).map(|e| e.event_id).ok_or_else(|| {
                 format!("Internal error: Invalid index {} selected for replacement.", index)
            })?
        },
        None => {
            warn!("Could not select a replacement event from the pool ({} candidates). Skipping swap.", replacement_candidates_with_weights.len());
            return Ok(());
        }
    };
    debug!("Selected Event ID {} as replacement candidate.", replacement_event_id);

    // --- 5. Perform Swap ---
    if swap_out_event_id == replacement_event_id {
        debug!("Swap-out candidate (Event {}) is the same as the selected replacement. No change needed.", swap_out_event_id);
        return Ok(());
    }

    if current_discovery_ids.contains(&replacement_event_id) && replacement_event_id != swap_out_event_id {
         warn!("Replacement candidate Event {} is already in discovery list (and is not the swap-out target). Logic error likely. Skipping swap.", replacement_event_id);
         return Ok(());
    }

    ctx.db.discovery_event().event_id().delete(swap_out_event_id);
    debug!("Removed swap-out Event ID {} from discovery.", swap_out_event_id);

    let new_entry = DiscoveryEvent {
        event_id: replacement_event_id,
        display_priority: swap_out_priority,
        added_at: now,
    };
    ctx.db.discovery_event().insert(new_entry);
    info!("Swapped Discovery Event ID {} (at Priority {}) with new Event ID {}", swap_out_event_id, swap_out_priority, replacement_event_id);

    Ok(())
}   
use spacetimedb::{reducer, ReducerContext, Timestamp, Table};
use log::{info, warn};
use crate::enums::*;
use crate::tables::*;
use crate::utils::*;

#[reducer]
pub fn create_event(
    ctx: &ReducerContext, creator_group_id: u64, name: String, description: String,
    start_time: Timestamp, end_time: Timestamp, ifc_event_link: Option<String>,
    banner_url: Option<String>, sub_events_data: Vec<SubEventData>, status: Option<EventStatus>,
) -> Result<(), String> {
    check_permission(ctx, creator_group_id, PermissionLevel::CEO)?;
    if name.trim().is_empty() { return Err("Event name cannot be empty.".to_string()); }
    if start_time >= end_time { return Err("Event start time must be before end time.".to_string()); }

    let event_status = status.unwrap_or(EventStatus::Draft);

    let new_event = Event {
        event_id: 0, creator_group_id, name, description, start_time, end_time,
        ifc_event_link, banner_url, status: event_status, created_at: ctx.timestamp,
    };
    let inserted_event = ctx.db.event().insert(new_event);
    let new_event_id = inserted_event.event_id;

    let host_participation = EventParticipant {
        participation_id: 0, event_id: new_event_id, group_id: creator_group_id,
        role: ParticipantRole::Host, status: ParticipantStatus::Accepted, 
    };
    ctx.db.event_participant().insert(host_participation);

    info!("Event '{}' (ID: {}) created by user {:?} for group {}", inserted_event.name, new_event_id, ctx.sender, creator_group_id);

    // Loop through SubEventData and create each SubEvent
    for sub_data in sub_events_data {
        if sub_data.name.trim().is_empty() { return Err(format!("SubEvent name '{}' cannot be empty.", sub_data.name)); }
        if sub_data.scheduled_start_time >= sub_data.scheduled_end_time {
            return Err(format!("SubEvent '{}' start time must be before end time.", sub_data.name));
        }
        if sub_data.scheduled_start_time < inserted_event.start_time || sub_data.scheduled_end_time > inserted_event.end_time {
            warn!("SubEvent '{}' times fall outside parent event times.", sub_data.name);
        }

        let (validated_hub_icao, validated_gf_dep_icao, validated_gf_arr_icao);
        match sub_data.sub_event_type {
            SubEventType::FlyIn | SubEventType::FlyOut => {
                let hub = sub_data.hub_icao.ok_or(format!("hub_icao is required for FlyIn/FlyOut SubEvent '{}'.", sub_data.name))?;
                if hub.len() != 4 { return Err(format!("hub_icao for SubEvent '{}' must be 4 letters.", sub_data.name)); }
                validated_hub_icao = Some(hub); validated_gf_dep_icao = None; validated_gf_arr_icao = None;
            }
            SubEventType::GroupFlight => {
                let dep = sub_data.group_flight_departure_icao.ok_or(format!("group_flight_departure_icao is required for GroupFlight SubEvent '{}'.", sub_data.name))?;
                let arr = sub_data.group_flight_arrival_icao.ok_or(format!("group_flight_arrival_icao is required for GroupFlight SubEvent '{}'.", sub_data.name))?;
                if dep.len() != 4 { return Err(format!("group_flight_departure_icao for SubEvent '{}' must be 4 letters.", sub_data.name)); }
                if arr.len() != 4 { return Err(format!("group_flight_arrival_icao for SubEvent '{}' must be 4 letters.", sub_data.name)); }
                validated_hub_icao = None; validated_gf_dep_icao = Some(dep); validated_gf_arr_icao = Some(arr);
            }
        }

        let new_sub_event = SubEvent {
            sub_event_id: 0, event_id: new_event_id,
            name: sub_data.name, description: sub_data.description,
            sub_event_type: sub_data.sub_event_type,
            scheduled_start_time: sub_data.scheduled_start_time,
            scheduled_end_time: sub_data.scheduled_end_time,
            hub_icao: validated_hub_icao.map(|s| s.to_uppercase()),
            group_flight_departure_icao: validated_gf_dep_icao.map(|s| s.to_uppercase()),
            group_flight_arrival_icao: validated_gf_arr_icao.map(|s| s.to_uppercase()),
            group_flight_route: sub_data.group_flight_route,
            notes: sub_data.notes,
        };
        ctx.db.sub_event().insert(new_sub_event);
    } 
    Ok(())
}

#[reducer]
pub fn update_event(
    ctx: &ReducerContext, event_id: u64, name: String, description: String,
    start_time: Timestamp, end_time: Timestamp, ifc_event_link: Option<String>,
    banner_url: Option<String>, status: EventStatus,
) -> Result<(), String> {
    is_event_host_staff_or_ceo(ctx, event_id)?;
    let mut event = find_event_or_err(ctx, event_id)?;

    if name.trim().is_empty() { return Err("Event name cannot be empty.".to_string()); }
    if start_time >= end_time { return Err("Event start time must be before end time.".to_string()); }

    event.name = name; event.description = description; event.start_time = start_time;
    event.end_time = end_time; event.ifc_event_link = ifc_event_link; event.banner_url = banner_url;
    event.status = status;

    ctx.db.event().event_id().update(event);
    info!("Event {} updated by user {:?}", event_id, ctx.sender);

    if status != EventStatus::Published && ctx.db.discovery_event().event_id().find(event_id).is_some() {
         ctx.db.discovery_event().event_id().delete(event_id);
         info!("Event {} removed from discovery due to status change.", event_id);
    }
    Ok(())
}

#[reducer]
pub fn invite_group_to_event(
    ctx: &ReducerContext, event_id: u64, invited_group_id: u64,
) -> Result<(), String> {
    is_event_host_staff_or_ceo(ctx, event_id)?;
    let _invited_group = find_group_or_err(ctx, invited_group_id)?;

    if is_group_participating_in_event(ctx, invited_group_id, event_id) {
        return Err(format!("Group {} is already participating in event {}.", invited_group_id, event_id));
    }

    let participation = EventParticipant {
        participation_id: 0, event_id, group_id: invited_group_id,
        role: ParticipantRole::Participant, status: ParticipantStatus::Pending, 
    };
    ctx.db.event_participant().insert(participation);
    info!("Group {} invited to event {} by user {:?}", invited_group_id, event_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn respond_to_event_invitation(
    ctx: &ReducerContext, event_id: u64, group_id: u64, 
    response: ParticipantStatus,
) -> Result<(), String> {
    check_permission(ctx, group_id, PermissionLevel::Staff)?;
    
    let participation = ctx.db.event_participant().iter()
        .find(|p| p.event_id == event_id && p.group_id == group_id && p.status == ParticipantStatus::Pending)
        .ok_or_else(|| format!("No pending invitation found for group {} to event {}.", group_id, event_id))?;
    
    if response == ParticipantStatus::Pending {
        return Err("Invalid response: Cannot set status back to Pending.".to_string());
    }
    
    let updated_participation = EventParticipant { status: response, ..participation };
    ctx.db.event_participant().participation_id().update(updated_participation);
    
    info!("Group {} responded {:?} to event {} invitation", group_id, response, event_id);
    Ok(())
}

#[reducer]
pub fn add_sub_event(
    ctx: &ReducerContext, event_id: u64, name: String, description: Option<String>,
    sub_event_type: SubEventType, scheduled_start_time: Timestamp, scheduled_end_time: Timestamp,
    hub_icao: Option<String>, group_flight_departure_icao: Option<String>,
    group_flight_arrival_icao: Option<String>, group_flight_route: Option<String>,
    notes: Option<String>,
) -> Result<(), String> {
    is_event_host_staff_or_ceo(ctx, event_id)?;
    let event = find_event_or_err(ctx, event_id)?;

    if name.trim().is_empty() { return Err("SubEvent name cannot be empty.".to_string()); }
    if scheduled_start_time >= scheduled_end_time { return Err("SubEvent start time must be before end time.".to_string()); }
    if scheduled_start_time < event.start_time || scheduled_end_time > event.end_time {
        warn!("SubEvent times fall outside parent event times.");
    }

    let (validated_hub_icao, validated_gf_dep_icao, validated_gf_arr_icao);
    match sub_event_type {
        SubEventType::FlyIn | SubEventType::FlyOut => {
            let hub = hub_icao.ok_or("hub_icao is required for FlyIn/FlyOut SubEvents.".to_string())?;
            if hub.len() != 4 { return Err("hub_icao must be 4 letters.".to_string()); }
            validated_hub_icao = Some(hub); validated_gf_dep_icao = None; validated_gf_arr_icao = None;
        }
        SubEventType::GroupFlight => {
            let dep = group_flight_departure_icao.ok_or("group_flight_departure_icao is required.".to_string())?;
            let arr = group_flight_arrival_icao.ok_or("group_flight_arrival_icao is required.".to_string())?;
            if dep.len() != 4 || arr.len() != 4 { return Err("ICAO codes must be 4 letters.".to_string()); }
            validated_hub_icao = None; validated_gf_dep_icao = Some(dep); validated_gf_arr_icao = Some(arr);
        }
    }

    let new_sub_event = SubEvent {
        sub_event_id: 0, event_id, name, description, sub_event_type,
        scheduled_start_time, scheduled_end_time,
        hub_icao: validated_hub_icao.map(|s| s.to_uppercase()),
        group_flight_departure_icao: validated_gf_dep_icao.map(|s| s.to_uppercase()),
        group_flight_arrival_icao: validated_gf_arr_icao.map(|s| s.to_uppercase()),
        group_flight_route, notes,
    };

    let inserted_sub_event = ctx.db.sub_event().insert(new_sub_event);
    info!("SubEvent '{}' added to Event {}", inserted_sub_event.name, event_id);
    Ok(())
}

#[reducer]
pub fn delete_sub_event(ctx: &ReducerContext, sub_event_id: u64) -> Result<(), String> {
    let sub_event = find_sub_event_or_err(ctx, sub_event_id)?;
    is_event_host_staff_or_ceo(ctx, sub_event.event_id)?;
    
    if ctx.db.flight_signup().iter().any(|signup| signup.sub_event_id == sub_event_id) {
        return Err(format!("Cannot delete sub-event {} as it has flight signups.", sub_event_id));
    }
    
    ctx.db.sub_event().sub_event_id().delete(sub_event_id);
    info!("SubEvent ID {} deleted from Event {}", sub_event_id, sub_event.event_id);
    Ok(())
}

#[reducer]
pub fn delete_event(ctx: &ReducerContext, event_id: u64) -> Result<(), String> {
    is_event_host_staff_or_ceo(ctx, event_id)?;
    let mut event = find_event_or_err(ctx, event_id)?;

    event.status = EventStatus::Cancelled;
    ctx.db.event().event_id().update(event);
    info!("Event {} cancelled by user {:?}", event_id, ctx.sender);
    Ok(())
}
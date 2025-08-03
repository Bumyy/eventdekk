use spacetimedb::{
    table, reducer, Table, ReducerContext, Identity, Timestamp, SpacetimeType,
    ScheduleAt, TimeDuration,
};
use log::{debug, info, warn};

// --- Enums ---
#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum PermissionLevel { Member = 1, Staff = 2, CEO = 3 }
#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum EventStatus { Draft = 0, Published = 1, InProgress = 2, Completed = 3, Cancelled = 4 }
#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum ParticipantStatus { Pending = 0, Accepted = 1, Declined = 2}
#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum ParticipantRole { Host = 0, Participant = 1 }
#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum SubEventType { FlyIn = 0, FlyOut = 1, GroupFlight = 2 }


// --- Tables ---
#[table(name = group, public,
    index(name = idx_ceo, btree(columns = [ceo_identity]))
)]
pub struct Group {
    #[primary_key] #[auto_inc] pub group_id: u64,
    pub name: String,
    pub tag: String,
    pub description: String,
    pub ceo_identity: Identity,
    pub ifvarb_approved: bool,
    pub website_url: Option<String>,
    pub logo_url: Option<String>,
    pub rating: Option<f32>,
    pub color: Option<String>,
    pub created_at: Timestamp,
}

#[table(name = group_membership, public,
    index(name = idx_user, btree(columns = [user_identity])),
    index(name = idx_group, btree(columns = [group_id])),
    index(name = idx_user_group, btree(columns = [user_identity, group_id]))
)]
pub struct GroupMembership {
    #[primary_key] #[auto_inc] pub membership_id: u64,
    pub user_identity: Identity,
    pub group_id: u64,
    pub permission_level: PermissionLevel,
}

#[table(name = user, public,
    index(name = idx_callsign_prefix, btree(columns = [ifc_callsign_prefix]))
)]
pub struct User {
    #[primary_key] pub identity: Identity,
    pub display_name: Option<String>,
    pub ifc_profile_url: Option<String>,
    pub online: bool,
    pub ifc_callsign_prefix: Option<String>,
    pub timezone: Option<String>,
}

#[table(name = event, public,
    index(name = idx_creator_group, btree(columns = [creator_group_id])),
    index(name = idx_start_time, btree(columns = [start_time])),
    index(name = idx_status, btree(columns = [status]))
)]
pub struct Event {
    #[primary_key] #[auto_inc] pub event_id: u64,
    pub creator_group_id: u64,
    pub name: String,
    pub description: String,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub ifc_event_link: Option<String>,
    pub banner_url: Option<String>,
    pub status: EventStatus,
    pub created_at: Timestamp,
}

#[table(name = event_participant, public,
    index(name = idx_event, btree(columns = [event_id])),
    index(name = idx_group, btree(columns = [group_id])),
    index(name = idx_event_group, btree(columns = [event_id, group_id]))
)]
pub struct EventParticipant {
    #[primary_key] #[auto_inc] pub participation_id: u64,
    pub event_id: u64,
    pub group_id: u64,
    pub role: ParticipantRole,
    pub status: ParticipantStatus,
}

#[table(name = sub_event, public,
    index(name = idx_event, btree(columns = [event_id])),
    index(name = idx_type, btree(columns = [sub_event_type])),
    index(name = idx_start_time, btree(columns = [scheduled_start_time]))
)]
pub struct SubEvent {
    #[primary_key] #[auto_inc] pub sub_event_id: u64,
    pub event_id: u64,
    pub name: String,
    pub description: Option<String>,
    pub sub_event_type: SubEventType,
    pub scheduled_start_time: Timestamp,
    pub scheduled_end_time: Timestamp,
    pub hub_icao: Option<String>,
    pub group_flight_departure_icao: Option<String>,
    pub group_flight_arrival_icao: Option<String>,
    pub group_flight_route: Option<String>,
    pub notes: Option<String>,
}

#[derive(SpacetimeType, Clone, Debug)]
pub struct SubEventData {
    pub name: String,
    pub description: Option<String>,
    pub sub_event_type: SubEventType,
    pub scheduled_start_time: Timestamp,
    pub scheduled_end_time: Timestamp,
    pub hub_icao: Option<String>,
    pub group_flight_departure_icao: Option<String>,
    pub group_flight_arrival_icao: Option<String>,
    pub group_flight_route: Option<String>,
    pub notes: Option<String>,
}

#[table(name = flight_signup, public,
    index(name = idx_sub_event, btree(columns = [sub_event_id])),
    index(name = idx_group, btree(columns = [group_id])),
    index(name = idx_callsign, btree(columns = [callsign]))
)]
pub struct FlightSignup {
    #[primary_key] #[auto_inc] pub signup_id: u64,
    pub sub_event_id: u64,
    pub group_id: u64,
    pub departure_icao: String,
    pub arrival_icao: String,
    pub route_details: Option<String>,
    pub callsign: Option<String>,
    pub aircraft_type: Option<String>,
    pub desired_departure_time: Option<Timestamp>,
    pub desired_arrival_time: Option<Timestamp>,
    pub created_at: Timestamp,
}

#[table(name = live_flight, public,
    index(name = idx_event, btree(columns = [event_id])),
    index(name = idx_sub_event, btree(columns = [sub_event_id])),
)]
pub struct LiveFlight {
    #[primary_key] pub flight_id: String,
    pub event_id: Option<u64>,
    pub sub_event_id: Option<u64>, 
    pub signup_id: Option<u64>,
    pub user_identity: Option<Identity>,
    pub group_id: Option<u64>,
    pub callsign: String,
    pub aircraft_id: String,
    pub livery_id: String,
    pub latitude: f64,
    pub longitude: f64,
    pub altitude: i32,
    pub heading: u16,
    pub ground_speed: u16,
    pub last_updated: Timestamp,
}

#[derive(SpacetimeType, Clone, Debug)]
pub struct LiveFlightData {
    pub flight_id: String,
    pub callsign: String,
    pub aircraft_id: String,
    pub livery_id: String,
    pub latitude: f64,
    pub longitude: f64,
    pub altitude: i32,
    pub heading: u16,
    pub ground_speed: u16,
    pub last_updated: Timestamp,
}

#[table(name = live_chat_message, public,
    index(name = idx_event_id, btree(columns = [event_id])),
)]
pub struct LiveChatMessage {
    #[primary_key] #[auto_inc] pub message_id: u64,
    pub sender: Identity,
    pub group_id: u64,
    pub event_id: u64,
    pub message: String,
    pub timestamp: Timestamp,
}

#[table(name = discovery_event, public,
    index(name = idx_priority, btree(columns = [display_priority]))
)]
#[derive(Clone)]
pub struct DiscoveryEvent {
    #[primary_key] pub event_id: u64,
    pub display_priority: u64,
    pub added_at: Timestamp,
}

#[table(name = discovery_rotation_schedule, scheduled(rotate_discovery_event))]
#[derive(Clone, Copy)]
struct DiscoveryRotationSchedule {
    #[primary_key] #[auto_inc] scheduled_id: u64,
    scheduled_at: ScheduleAt,
}


// --- Helper Functions ---

fn get_group_permission(
    ctx: &ReducerContext,
    group_id: u64,
) -> Option<PermissionLevel> {
    ctx.db.group_membership().iter()
        .find(|m| m.user_identity == ctx.sender && m.group_id == group_id)
        .map(|m| m.permission_level)
}

fn check_permission(
    ctx: &ReducerContext,
    group_id: u64,
    required_level: PermissionLevel,
) -> Result<(), String> {
    match get_group_permission(ctx, group_id) {
        Some(level) if level as u8 >= required_level as u8 => Ok(()),
        _ => Err(format!(
            "User {:?} lacks required permission ({:?}) for group {}",
            ctx.sender, required_level, group_id
        )),
    }
}

fn is_event_host_staff_or_ceo(ctx: &ReducerContext, event_id: u64) -> Result<(), String> {
    let is_authorized = ctx.db.event_participant().iter()
        .any(|p| p.event_id == event_id
                 && p.role == ParticipantRole::Host
                 && check_permission(ctx, p.group_id, PermissionLevel::Staff).is_ok());

    if is_authorized {
        Ok(())
    } else {
        Err(format!(
            "User {:?} is not Staff/CEO of any host group for event {}",
            ctx.sender, event_id
        ))
    }
}

fn is_group_participating_in_event(ctx: &ReducerContext, group_id: u64, event_id: u64) -> bool {
     ctx.db.event_participant().iter()
        .any(|p| p.event_id == event_id && p.group_id == group_id)
}

// Helper to find a struct by PK and return Err if not found
fn find_event_or_err(ctx: &ReducerContext, event_id: u64) -> Result<Event, String> {
    ctx.db.event().event_id().find(event_id)
        .ok_or_else(|| format!("Event with ID {} not found", event_id))
}
fn find_group_or_err(ctx: &ReducerContext, group_id: u64) -> Result<Group, String> {
    ctx.db.group().group_id().find(group_id)
       .ok_or_else(|| format!("Group with ID {} not found", group_id))
}
fn find_sub_event_or_err(ctx: &ReducerContext, sub_event_id: u64) -> Result<SubEvent, String> {
    ctx.db.sub_event().sub_event_id().find(sub_event_id)
       .ok_or_else(|| format!("SubEvent with ID {} not found", sub_event_id))
}
// fn find_live_flight_or_err(ctx: &ReducerContext, callsign: &String) -> Result<LiveFlight, String> {
//     // Assuming callsign is the PK for LiveFlight
//     ctx.db.live_flight().callsign().find(callsign.clone()) // PK is String, find needs owned value?
//         .ok_or_else(|| format!("LiveFlight with callsign {} not found", callsign))
// }
// fn find_discovery_event_or_err(ctx: &ReducerContext, event_id: u64) -> Result<DiscoveryEvent, String> {
//     ctx.db.discovery_event().event_id().find(event_id)
//         .ok_or_else(|| format!("DiscoveryEvent for Event ID {} not found", event_id))
// }

// --- User & Connection Reducers ---

#[reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    if let Some(user) = ctx.db.user().identity().find(identity) {
        info!("User reconnected: {:?}", identity);
        ctx.db.user().identity().update(User { online: true, ..user });
    } else {
        info!("New user connected: {:?}", identity);
        ctx.db.user().insert(User {
            identity, display_name: None, ifc_profile_url: None,
            online: true, ifc_callsign_prefix: None, timezone: None,
        });
    }
}

#[reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    if let Some(user) = ctx.db.user().identity().find(identity) {
        info!("User disconnected: {:?}", identity);
        ctx.db.user().identity().update(User { online: false, ..user });
    } else {
        warn!("Disconnect event for unknown user: {:?}", identity);
    }
}

#[reducer]
pub fn set_user_profile(
    ctx: &ReducerContext,
    display_name: String,
    ifc_profile_url: Option<String>,
    ifc_callsign_prefix: Option<String>,
    timezone: Option<String>,
) -> Result<(), String> {
    let identity = ctx.sender;
    if let Some(mut user) = ctx.db.user().identity().find(identity) {
        if display_name.trim().is_empty() {
            return Err("Display name cannot be empty.".to_string());
        }
        // Add more validation for URL format if needed

        user.display_name = Some(display_name);
        user.ifc_profile_url = ifc_profile_url;
        user.ifc_callsign_prefix = ifc_callsign_prefix;
        user.timezone = timezone;
        ctx.db.user().identity().update(user);
        Ok(())
    } else {
        Err("User not found.".to_string())
    }
}

// --- Group Management Reducers ---

#[reducer]
pub fn register_group(
    ctx: &ReducerContext,
    name: String,
    tag: String,
    description: String,
    website_url: Option<String>,
    logo_url: Option<String>,
) -> Result<(), String> {
    // TODO: Add admin check if needed
    let ceo_identity = ctx.sender;

    if name.trim().is_empty() || tag.trim().is_empty() {
        return Err("Group name and tag cannot be empty.".to_string());
    }
    if ctx.db.group().iter().any(|g| g.tag == tag) {
        return Err(format!("Group tag '{}' already exists.", tag));
    }

    let new_group = Group {
        group_id: 0, name, tag, description, ceo_identity,
        ifvarb_approved: true, // Assumed pre-approved
        website_url, logo_url, rating: None, created_at: ctx.timestamp, color: None,
    };
    let inserted_group = ctx.db.group().insert(new_group);

    let ceo_membership = GroupMembership {
        membership_id: 0, user_identity: ceo_identity,
        group_id: inserted_group.group_id, permission_level: PermissionLevel::CEO,
    };
    ctx.db.group_membership().insert(ceo_membership);

    info!("Group '{}' registered by CEO {:?}", inserted_group.name, ceo_identity);
    Ok(())
}

#[reducer]
pub fn update_group(
    ctx: &ReducerContext,
    group_id: u64,
    name: String,
    tag: String,
    description: String,
    website_url: Option<String>,
    logo_url: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    // Check if the user has permission to update the group (must be Staff or CEO)
    check_permission(ctx, group_id, PermissionLevel::Staff)?;
    
    // Find the existing group
    let mut group = find_group_or_err(ctx, group_id)?;
    
    // Validate input
    if name.trim().is_empty() {
        return Err("Group name cannot be empty.".to_string());
    }
    
    // Update the group fields
    group.name = name;
    group.tag = tag;
    group.description = description;
    group.website_url = website_url;
    group.logo_url = logo_url;
    group.color = color;
    
    // Save the updated group
    ctx.db.group().group_id().update(group);
    
    info!("Group {} updated by user {:?}", group_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn add_group_member(
    ctx: &ReducerContext,
    group_id: u64,
    user_identity: Identity,
    permission_level: PermissionLevel,
) -> Result<(), String> {
    // Check if caller has permission (Staff or CEO)
    check_permission(ctx, group_id, PermissionLevel::Staff)?;

    // Check if trying to add CEO role (only existing CEO can do this)
    if permission_level == PermissionLevel::CEO {
         if let Some(group) = ctx.db.group().group_id().find(group_id) {
             if ctx.sender != group.ceo_identity {
                 // Allow main CEO to add other CEOs, but not staff
                 check_permission(ctx, group_id, PermissionLevel::CEO)?;
             }
         } else { return Err(format!("Group {} not found.", group_id)); }
    }

    // Check if user exists
    if ctx.db.user().identity().find(user_identity).is_none() {
        return Err(format!("User {:?} does not exist.", user_identity));
    }

    // Check if membership already exists
     if ctx.db.group_membership().iter()
        .any(|m| m.user_identity == user_identity && m.group_id == group_id) {
        return Err(format!("User {:?} is already a member of group {}.", user_identity, group_id));
     }

    let new_membership = GroupMembership {
        membership_id: 0, user_identity, group_id, permission_level,
    };
    ctx.db.group_membership().insert(new_membership);

    info!("User {:?} added to group {} with level {:?} by user {:?}", user_identity, group_id, permission_level, ctx.sender);
    Ok(())
}


#[reducer]
pub fn remove_group_member(
    ctx: &ReducerContext,
    group_id: u64,
    user_identity: Identity,
) -> Result<(), String> {
    // Check caller permission (Staff or CEO)
    check_permission(ctx, group_id, PermissionLevel::Staff)?;

    let group = find_group_or_err(ctx, group_id)?;
    if user_identity == group.ceo_identity {
        return Err("Cannot remove the primary CEO via this function. Use transfer_ceo.".to_string());
    }

    // Find the membership entry to delete
    let membership_to_delete = ctx.db.group_membership().iter()
        .find(|m| m.user_identity == user_identity && m.group_id == group_id);

    if let Some(membership) = membership_to_delete {
        // Prevent staff from removing CEO/other Staff (only primary CEO can)
        if membership.permission_level as u8 >= PermissionLevel::Staff as u8 {
             check_permission(ctx, group_id, PermissionLevel::CEO)?; // Ensure caller is primary CEO
        }

        ctx.db.group_membership().membership_id().delete(membership.membership_id);
        info!("User {:?} removed from group {} by user {:?}", user_identity, group_id, ctx.sender);
        Ok(())
    } else {
        Err(format!("User {:?} is not a member of group {}.", user_identity, group_id))
    }
}

// --- Event Management Reducers ---

#[reducer]
pub fn create_event(
    ctx: &ReducerContext,
    creator_group_id: u64,
    name: String,
    description: String,
    start_time: Timestamp,
    end_time: Timestamp,
    ifc_event_link: Option<String>,
    banner_url: Option<String>,
    // New parameter for sub-event data
    sub_events_data: Vec<SubEventData>,
) -> Result<(), String> {
    // 1. Check Permissions and Validate Main Event Data
    check_permission(ctx, creator_group_id, PermissionLevel::CEO)?;
    if name.trim().is_empty() { return Err("Event name cannot be empty.".to_string()); }
    if start_time >= end_time { return Err("Event start time must be before end time.".to_string()); }

    // 2. Create the Main Event
    let new_event = Event {
        event_id: 0, // Auto-incremented by DB
        creator_group_id, name, description, start_time, end_time,
        ifc_event_link, banner_url, status: EventStatus::Published, created_at: ctx.timestamp,
    };
    let inserted_event = ctx.db.event().insert(new_event);
    let new_event_id = inserted_event.event_id; // Get the ID of the created event

    // 3. Add Host Participation
    let host_participation = EventParticipant {
        participation_id: 0, // Auto-incremented
        event_id: new_event_id, // Use the ID from the inserted event
        group_id: creator_group_id,
        role: ParticipantRole::Host,
        status: ParticipantStatus::Accepted, 
    };
    ctx.db.event_participant().insert(host_participation);

    info!("Event '{}' (ID: {}) created by user {:?} for group {}", inserted_event.name, new_event_id, ctx.sender, creator_group_id);

    // 4. Loop through SubEventData and create each SubEvent
    for sub_data in sub_events_data {
        // We replicate the validation and creation logic from add_sub_event here
        // to keep it within one reducer transaction and avoid reducer-calling-reducer issues.

        // Check Permissions (redundant if only host can add sub-events, but good practice)
        // is_event_host_staff_or_ceo(ctx, new_event_id)?; // Already checked CEO for main event creation

        // Validate SubEvent Data
        if sub_data.name.trim().is_empty() {
            return Err(format!("SubEvent name '{}' cannot be empty.", sub_data.name));
        }
        if sub_data.scheduled_start_time >= sub_data.scheduled_end_time {
            return Err(format!("SubEvent '{}' start time must be before end time.", sub_data.name));
        }
        // Check times are within parent event bounds (using inserted_event)
        if sub_data.scheduled_start_time < inserted_event.start_time || sub_data.scheduled_end_time > inserted_event.end_time {
            warn!("SubEvent '{}' times ({:?} - {:?}) fall outside parent event times ({:?} - {:?}).",
                  sub_data.name, sub_data.scheduled_start_time, sub_data.scheduled_end_time, inserted_event.start_time, inserted_event.end_time);
            // Potentially return Err(...) here if strict bounds are required
        }

        // Validate required fields based on type
        let (validated_hub_icao, validated_gf_dep_icao, validated_gf_arr_icao);
        match sub_data.sub_event_type {
            SubEventType::FlyIn | SubEventType::FlyOut => {
                let hub = sub_data.hub_icao.ok_or(format!("hub_icao is required for FlyIn/FlyOut SubEvent '{}'.", sub_data.name))?;
                if hub.len() != 4 { return Err(format!("hub_icao for SubEvent '{}' must be 4 letters.", sub_data.name)); }
                validated_hub_icao = Some(hub);
                validated_gf_dep_icao = None;
                validated_gf_arr_icao = None;
            }
            SubEventType::GroupFlight => {
                let dep = sub_data.group_flight_departure_icao.ok_or(format!("group_flight_departure_icao is required for GroupFlight SubEvent '{}'.", sub_data.name))?;
                let arr = sub_data.group_flight_arrival_icao.ok_or(format!("group_flight_arrival_icao is required for GroupFlight SubEvent '{}'.", sub_data.name))?;
                if dep.len() != 4 { return Err(format!("group_flight_departure_icao for SubEvent '{}' must be 4 letters.", sub_data.name)); }
                if arr.len() != 4 { return Err(format!("group_flight_arrival_icao for SubEvent '{}' must be 4 letters.", sub_data.name)); }
                validated_hub_icao = None;
                validated_gf_dep_icao = Some(dep);
                validated_gf_arr_icao = Some(arr);
            }
        }

        // Create the SubEvent struct
        let new_sub_event = SubEvent {
            sub_event_id: 0, // Auto-incremented
            event_id: new_event_id, // Link to the parent event we just created
            name: sub_data.name,
            description: sub_data.description,
            sub_event_type: sub_data.sub_event_type,
            scheduled_start_time: sub_data.scheduled_start_time,
            scheduled_end_time: sub_data.scheduled_end_time,
            hub_icao: validated_hub_icao.map(|s| s.to_uppercase()),
            group_flight_departure_icao: validated_gf_dep_icao.map(|s| s.to_uppercase()),
            group_flight_arrival_icao: validated_gf_arr_icao.map(|s| s.to_uppercase()),
            group_flight_route: sub_data.group_flight_route,
            notes: sub_data.notes,
        };

        // Insert the SubEvent
        let inserted_sub = ctx.db.sub_event().insert(new_sub_event);
        info!(" -> SubEvent '{}' (ID: {}) added to Event {}", inserted_sub.name, inserted_sub.sub_event_id, new_event_id);

    } // End loop through sub_events_data

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

    event.name = name;
    event.description = description;
    event.start_time = start_time;
    event.end_time = end_time;
    event.ifc_event_link = ifc_event_link;
    event.banner_url = banner_url;
    event.status = status;

    ctx.db.event().event_id().update(event);
    info!("Event {} updated by user {:?}", event_id, ctx.sender);

    if status == EventStatus::Published {
         //update_discovery_on_publish(ctx, event_id, start_time, status);
    } else {
        if ctx.db.discovery_event().event_id().find(event_id).is_some() {
             ctx.db.discovery_event().event_id().delete(event_id);
             info!("Event {} removed from discovery due to status change.", event_id);
        }
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
        role: ParticipantRole::Participant,
        status: ParticipantStatus::Pending, 
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
    // Check if the user has permission to respond on behalf of the group
    check_permission(ctx, group_id, PermissionLevel::Staff)?;
    
    // Find the existing invitation
    let participation = ctx.db.event_participant().iter()
        .find(|p| p.event_id == event_id && p.group_id == group_id && p.status == ParticipantStatus::Pending)
        .ok_or_else(|| format!("No pending invitation found for group {} to event {}.", group_id, event_id))?;
    
    // Validate the response
    if response == ParticipantStatus::Pending {
        return Err("Invalid response: Cannot set status back to Pending.".to_string());
    }
    
    // Update the participation status
    let updated_participation = EventParticipant {
        status: response,
        ..participation
    };
    ctx.db.event_participant().participation_id().update(updated_participation);
    
    info!("Group {} responded {:?} to event {} invitation (by user {:?})", 
          group_id, response, event_id, ctx.sender);
    
    Ok(())
}

// --- SubEvent Management Reducers ---

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
        warn!("SubEvent times ({:?} - {:?}) fall outside parent event times ({:?} - {:?}).",
              scheduled_start_time, scheduled_end_time, event.start_time, event.end_time);
    }

    let (validated_hub_icao, validated_gf_dep_icao, validated_gf_arr_icao);
    match sub_event_type {
        SubEventType::FlyIn | SubEventType::FlyOut => {
            let hub = hub_icao.ok_or("hub_icao is required for FlyIn/FlyOut SubEvents.".to_string())?;
            if hub.len() != 4 { return Err("hub_icao must be 4 letters.".to_string()); }
            validated_hub_icao = Some(hub);
            validated_gf_dep_icao = None;
            validated_gf_arr_icao = None;
        }
        SubEventType::GroupFlight => {
            let dep = group_flight_departure_icao.ok_or("group_flight_departure_icao is required for GroupFlight SubEvents.".to_string())?;
            let arr = group_flight_arrival_icao.ok_or("group_flight_arrival_icao is required for GroupFlight SubEvents.".to_string())?;
            if dep.len() != 4 { return Err("group_flight_departure_icao must be 4 letters.".to_string()); }
            if arr.len() != 4 { return Err("group_flight_arrival_icao must be 4 letters.".to_string()); }
            validated_hub_icao = None;
            validated_gf_dep_icao = Some(dep);
            validated_gf_arr_icao = Some(arr);
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
    info!("SubEvent '{}' (ID: {}) added to Event {} by user {:?}", inserted_sub_event.name, inserted_sub_event.sub_event_id, event_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn delete_sub_event(
    ctx: &ReducerContext, 
    sub_event_id: u64
) -> Result<(), String> {
    // Find the sub-event first
    let sub_event = find_sub_event_or_err(ctx, sub_event_id)?;
    
    // Check if user has permission to delete this sub-event
    // (must be Staff or CEO of a host group for the event)
    is_event_host_staff_or_ceo(ctx, sub_event.event_id)?;
    
    // Check for any related flight signups
    let has_signups = ctx.db.flight_signup().iter()
        .any(|signup| signup.sub_event_id == sub_event_id);
    
    if has_signups {
        return Err(format!("Cannot delete sub-event {} as it has flight signups. Remove the signups first.", sub_event_id));
    }
    
    // Delete the sub-event
    ctx.db.sub_event().sub_event_id().delete(sub_event_id);
    
    info!("SubEvent ID {} deleted from Event {} by user {:?}", 
          sub_event_id, sub_event.event_id, ctx.sender);
    
    Ok(())
}

// --- Flight Signup Reducers ---

#[reducer]
pub fn signup_for_flight(
    ctx: &ReducerContext, sub_event_id: u64, group_id: u64, departure_icao: String,
    arrival_icao: String, route_details: Option<String>, callsign: Option<String>,
    aircraft_type: Option<String>, desired_departure_time: Option<Timestamp>,
    desired_arrival_time: Option<Timestamp>,
) -> Result<(), String> {
    check_permission(ctx, group_id, PermissionLevel::Member)?;
    let sub_event = find_sub_event_or_err(ctx, sub_event_id)?;
    let event = find_event_or_err(ctx, sub_event.event_id)?;

    if !is_group_participating_in_event(ctx, group_id, sub_event.event_id) {
        return Err(format!("Group {} is not participating in the parent event {} and cannot sign up.", group_id, sub_event.event_id));
    }
    if event.status != EventStatus::Published && event.status != EventStatus::InProgress {
         return Err(format!("Cannot sign up for flights in event {} as it is not Published or InProgress (Status: {:?}).", event.event_id, event.status));
    }
    if departure_icao.len() != 4 || arrival_icao.len() != 4 {
        return Err("Departure and Arrival ICAO codes must be 4 letters.".to_string());
    }
    let departure_icao_upper = departure_icao.to_uppercase();
    let arrival_icao_upper = arrival_icao.to_uppercase();

    match sub_event.sub_event_type {
        SubEventType::FlyIn => {
            if Some(&arrival_icao_upper) != sub_event.hub_icao.as_ref() {
                return Err(format!("For FlyIn SubEvent {}, arrival_icao must match hub_icao (Expected: {}, Provided: {}).", sub_event_id, sub_event.hub_icao.as_deref().unwrap_or("N/A"), arrival_icao_upper));
            }
        }
        SubEventType::FlyOut => {
            if Some(&departure_icao_upper) != sub_event.hub_icao.as_ref() {
                 return Err(format!("For FlyOut SubEvent {}, departure_icao must match hub_icao (Expected: {}, Provided: {}).", sub_event_id, sub_event.hub_icao.as_deref().unwrap_or("N/A"), departure_icao_upper));
            }
        }
        SubEventType::GroupFlight => {
            if Some(&departure_icao_upper) != sub_event.group_flight_departure_icao.as_ref() {
                 return Err(format!("For GroupFlight SubEvent {}, departure_icao must match group_flight_departure_icao (Expected: {}, Provided: {}).", sub_event_id, sub_event.group_flight_departure_icao.as_deref().unwrap_or("N/A"), departure_icao_upper));
            }
            if Some(&arrival_icao_upper) != sub_event.group_flight_arrival_icao.as_ref() {
                 return Err(format!("For GroupFlight SubEvent {}, arrival_icao must match group_flight_arrival_icao (Expected: {}, Provided: {}).", sub_event_id, sub_event.group_flight_arrival_icao.as_deref().unwrap_or("N/A"), arrival_icao_upper));
            }
        }
    }

    let new_signup = FlightSignup {
        signup_id: 0, sub_event_id, group_id,
        departure_icao: departure_icao_upper, arrival_icao: arrival_icao_upper,
        route_details, callsign, aircraft_type, desired_departure_time, desired_arrival_time,
        created_at: ctx.timestamp,
    };

    let inserted_signup = ctx.db.flight_signup().insert(new_signup);
    info!("Group {} signed up for SubEvent {} (Signup ID: {}) by user {:?}", group_id, sub_event_id, inserted_signup.signup_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn update_flight_signup(
    ctx: &ReducerContext, signup_id: u64, departure_icao: String,
    arrival_icao: String, route_details: Option<String>, 
    callsign: Option<String>, aircraft_type: Option<String>, 
    desired_departure_time: Option<Timestamp>, desired_arrival_time: Option<Timestamp>,
) -> Result<(), String> {
    // Find the existing signup
    let signup = ctx.db.flight_signup().signup_id().find(signup_id)
        .ok_or_else(|| format!("Flight signup with ID {} not found", signup_id))?;
    
    // Check if user has permission for the group
    check_permission(ctx, signup.group_id, PermissionLevel::Member)?;
    
    // Get related records to validate event status
    let sub_event = find_sub_event_or_err(ctx, signup.sub_event_id)?;
    let event = find_event_or_err(ctx, sub_event.event_id)?;
    
    // Only allow updates if event is in appropriate status
    if event.status != EventStatus::Published && event.status != EventStatus::InProgress {
        return Err(format!("Cannot update flight signup for event {} as it is not Published or InProgress (Status: {:?}).", 
            event.event_id, event.status));
    }

    let departure_icao_upper = departure_icao.to_uppercase();
    let arrival_icao_upper = arrival_icao.to_uppercase();

    match sub_event.sub_event_type {
        SubEventType::FlyIn => {
            if Some(&arrival_icao_upper) != sub_event.hub_icao.as_ref() {
                return Err(format!("For FlyIn SubEvent {}, arrival_icao must match hub_icao (Expected: {}, Provided: {}).", signup.sub_event_id, sub_event.hub_icao.as_deref().unwrap_or("N/A"), arrival_icao_upper));
            }
        }
        SubEventType::FlyOut => {
            if Some(&departure_icao_upper) != sub_event.hub_icao.as_ref() {
                 return Err(format!("For FlyOut SubEvent {}, departure_icao must match hub_icao (Expected: {}, Provided: {}).", signup.sub_event_id, sub_event.hub_icao.as_deref().unwrap_or("N/A"), departure_icao_upper));
            }
        }
        SubEventType::GroupFlight => {
            if Some(&departure_icao_upper) != sub_event.group_flight_departure_icao.as_ref() {
                 return Err(format!("For GroupFlight SubEvent {}, departure_icao must match group_flight_departure_icao (Expected: {}, Provided: {}).", signup.sub_event_id, sub_event.group_flight_departure_icao.as_deref().unwrap_or("N/A"), departure_icao_upper));
            }
            if Some(&arrival_icao_upper) != sub_event.group_flight_arrival_icao.as_ref() {
                 return Err(format!("For GroupFlight SubEvent {}, arrival_icao must match group_flight_arrival_icao (Expected: {}, Provided: {}).", signup.sub_event_id, sub_event.group_flight_arrival_icao.as_deref().unwrap_or("N/A"), arrival_icao_upper));
            }
        }
    }
    
    // Create updated signup with all fields preserved except those being updated
    let updated_signup = FlightSignup {
        departure_icao: departure_icao_upper,
        arrival_icao: arrival_icao_upper,
        route_details,
        callsign,
        aircraft_type,
        desired_departure_time,
        desired_arrival_time,
        ..signup
    };
    
    // Update the record
    ctx.db.flight_signup().signup_id().update(updated_signup);
    
    info!("Flight signup {} updated by user {:?}", signup_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn delete_flight_signup(
    ctx: &ReducerContext, signup_id: u64
) -> Result<(), String> {
    // Find the existing signup
    let signup = ctx.db.flight_signup().signup_id().find(signup_id)
        .ok_or_else(|| format!("Flight signup with ID {} not found", signup_id))?;
    
    // Check if user has permission for the group
    // Requiring staff permission to delete signups provides more control
    check_permission(ctx, signup.group_id, PermissionLevel::Staff)?;
    
    // Get related records to validate event status
    let sub_event = find_sub_event_or_err(ctx, signup.sub_event_id)?;
    let event = find_event_or_err(ctx, sub_event.event_id)?;
    
    // Only allow deletion if event is in appropriate status
    if event.status != EventStatus::Published && event.status != EventStatus::InProgress {
        return Err(format!("Cannot delete flight signup for event {} as it is not Published or InProgress (Status: {:?}).", 
            event.event_id, event.status));
    }
    
    // Delete the signup
    ctx.db.flight_signup().signup_id().delete(signup_id);
    
    info!("Flight signup {} deleted by user {:?}", signup_id, ctx.sender);
    Ok(())
}

// --- Live Dashboard Reducer ---

#[reducer]
pub fn update_live_flights(
    ctx: &ReducerContext, flights: Vec<LiveFlightData>,
) -> Result<(), String> {
    // Create a set of flight_ids from the new flights for efficient lookup
    let new_flight_ids: std::collections::HashSet<String> = flights.iter()
        .map(|f| f.flight_id.clone())
        .collect();
    
    // Remove flights that don't exist in the new data
    for existing_flight in ctx.db.live_flight().iter() {
        if !new_flight_ids.contains(&existing_flight.flight_id) {
            debug!("Removing flight: {}", existing_flight.flight_id);
            ctx.db.live_flight().flight_id().delete(existing_flight.flight_id.clone());
        }
    }
    
    // Add or update flights
    for flight_data in flights {
        // Check if this flight already exists
        if let Some(existing_flight) = ctx.db.live_flight().flight_id().find(flight_data.flight_id.clone()) {
            // Update existing flight
            let updated_flight = LiveFlight {
                flight_id: flight_data.flight_id,
                event_id: existing_flight.event_id,
                sub_event_id: existing_flight.sub_event_id,
                signup_id: existing_flight.signup_id,
                user_identity: existing_flight.user_identity,
                group_id: existing_flight.group_id,
                callsign: flight_data.callsign,
                aircraft_id: flight_data.aircraft_id,
                livery_id: flight_data.livery_id,
                latitude: flight_data.latitude,
                longitude: flight_data.longitude,
                altitude: flight_data.altitude,
                heading: flight_data.heading,
                ground_speed: flight_data.ground_speed,
                last_updated: flight_data.last_updated,
            };
            ctx.db.live_flight().flight_id().update(updated_flight);
        } else {
            // Insert new flight (with default None values for additional fields)
            let new_flight = LiveFlight {
                flight_id: flight_data.flight_id,
                event_id: None,
                sub_event_id: None,
                signup_id: None,
                user_identity: None,
                group_id: None,
                callsign: flight_data.callsign,
                aircraft_id: flight_data.aircraft_id,
                livery_id: flight_data.livery_id,
                latitude: flight_data.latitude,
                longitude: flight_data.longitude,
                altitude: flight_data.altitude,
                heading: flight_data.heading,
                ground_speed: flight_data.ground_speed,
                last_updated: flight_data.last_updated,
            };
            ctx.db.live_flight().insert(new_flight);
        }
    }

    debug!("Live flights updated");
    Ok(())
}

// --- Live Chat Reducers ---

#[reducer]
pub fn add_live_chat_message(
    ctx: &ReducerContext, group_id: u64, event_id: u64, message: String,
) -> Result<(), String> {
    // Validate message length (example: max 500 characters)
    if message.len() > 500 {
        return Err("Message exceeds maximum length of 500 characters.".to_string());
    }

    // Check if event exists and is in progress
    let event = ctx.db.event().event_id().find(event_id)
        .ok_or_else(|| format!("Event {} not found.", event_id))?;
    //if event.status != EventStatus::InProgress {
    //    return Err(format!("Cannot send chat message for event {} as it is not in progress (Status: {:?}).", event_id, event.status));
    //}

    // Check if group exists
    let group = ctx.db.group().group_id().find(group_id)
        .ok_or_else(|| format!("Group {} not found.", group_id))?;

    // Create and insert the chat message
    let chat_message = LiveChatMessage {
        message_id: 0, // Auto-incremented by DB
        group_id,
        event_id,
        sender: ctx.sender,
        message,
        timestamp: ctx.timestamp,
    };
    ctx.db.live_chat_message().insert(chat_message);

    info!("Chat message added to event {} by user {:?}", group_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn edit_live_chat_message(
    ctx: &ReducerContext, message_id: u64, new_message: String,
) -> Result<(), String> {
    // Validate message length (example: max 500 characters)
    if new_message.len() > 500 {
        return Err("Message exceeds maximum length of 500 characters.".to_string());
    }

    // Find the existing message
    let mut chat_message = ctx.db.live_chat_message().message_id().find(message_id)
        .ok_or_else(|| format!("Chat message {} not found.", message_id))?;

    // Check if user is the sender or has permission to edit
    if chat_message.sender != ctx.sender {
        return Err("You do not have permission to edit this message.".to_string());
    }

    // Update the message content
    chat_message.message = new_message;
    ctx.db.live_chat_message().message_id().update(chat_message);

    info!("Chat message {} edited by user {:?}", message_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn delete_live_chat_message(
    ctx: &ReducerContext, message_id: u64,
) -> Result<(), String> {
    // Find the existing message
    let chat_message = ctx.db.live_chat_message().message_id().find(message_id)
        .ok_or_else(|| format!("Chat message {} not found.", message_id))?;

    // Check if user is the sender or has permission to delete
    if chat_message.sender != ctx.sender {
        return Err("You do not have permission to delete this message.".to_string());
    }

    // Delete the message
    ctx.db.live_chat_message().message_id().delete(message_id);

    info!("Chat message {} deleted by user {:?}", message_id, ctx.sender);
    Ok(())
}

// --- Discovery System Reducers ---

use std::collections::{HashMap, HashSet};

// --- Constants ---
const MAX_DISCOVERY_SIZE: usize = 6;
const SWAP_INTERVAL_MICROS: i64 = 60 * 1_000_000; // 1 second
const ELIGIBILITY_LOOKAHEAD_MICROS: i64 = 30 * 60 * 1_000_000; // 30 minutes
const CLEANUP_LOOKAHEAD_MICROS: i64 = 5 * 60 * 1_000_000; // 5 minutes

// --- Reducers and Helper Functions ---

#[reducer(init)]
fn init_discovery_system(ctx: &ReducerContext) {
    // Clear potentially stale data from previous runs
    for item in ctx.db.discovery_event().iter() {
        ctx.db.discovery_event().event_id().delete(item.event_id);
    }
    for item in ctx.db.discovery_rotation_schedule().iter() {
        ctx.db.discovery_rotation_schedule().scheduled_id().delete(item.scheduled_id);
    }
    info!("Cleared previous discovery data.");

    // Populate and schedule anew
    populate_initial_discovery(ctx);
    schedule_discovery_rotation(ctx);
    info!("Initialized Discovery System.");
}

fn schedule_discovery_rotation(ctx: &ReducerContext) {
    // Corrected: Uses i64 constant, no type error now
    let rotation_interval = TimeDuration::from_micros(SWAP_INTERVAL_MICROS);
    if ctx.db.discovery_rotation_schedule().iter().count() == 0 {

        ctx.db.discovery_rotation_schedule().insert(DiscoveryRotationSchedule {
            scheduled_id: 0,
            scheduled_at: rotation_interval.into(),
        });
        info!("Scheduled initial discovery rotation at {:?}", ctx.timestamp + rotation_interval);
    } else {
        // Optionally, ensure the schedule is still valid or reschedule if needed
        // For simplicity, we assume the existing schedule is sufficient after init
        debug!("Discovery rotation already scheduled.");
    }
}


fn populate_initial_discovery(ctx: &ReducerContext) {
    info!("Populating initial discovery queue...");
    let now = ctx.timestamp;
    // Corrected: Uses i64 constant, no type error now
    let min_start_time = now + TimeDuration::from_micros(ELIGIBILITY_LOOKAHEAD_MICROS);

    // 1. Find eligible candidate events
    let mut candidates: Vec<Event> = ctx.db.event().iter()
        .filter(|e| e.status == EventStatus::Published && e.start_time > min_start_time)
        .collect(); // Collect owned Events directly

    // 2. Sort candidates by start time (earliest first)
    candidates.sort_by_key(|e| e.start_time);

    // 3. Assign priorities (lower number = higher priority)
    let mut current_priority = 1u64;
    for event in candidates.iter().take(MAX_DISCOVERY_SIZE) {
        let discovery_entry = DiscoveryEvent {
            event_id: event.event_id,
            display_priority: current_priority,
            added_at: now,
        };
        // Use insert or update depending on whether duplicates might occur during init
        // Assuming event_id is unique PK, insert is fine here.
        ctx.db.discovery_event().insert(discovery_entry);
        debug!("Initially added Event ID {} with priority {}", event.event_id, current_priority);
        current_priority += 1;
    }
    info!("Added {} initial events to discovery queue.", current_priority.saturating_sub(1));
}

// Helper: Weighted Random Selection (remains the same conceptually)
fn select_weighted_random_index(
    items_with_weights: &Vec<(u64, u64)>, // Assumes (item_id, weight)
    seed: u64,
) -> Option<usize> {
    if items_with_weights.is_empty() { return None; }
    let total_weight: u64 = items_with_weights.iter().map(|(_, w)| *w).sum();
    if total_weight == 0 {
        warn!("Total weight is zero during weighted random selection.");
        // Fallback: Return a random index uniformly if weights are zero? Or first/last?
        // Returning None might be safer if zero weight implies nothing selectable.
        return None;
        // Or, return a random index based on count:
        // return Some((seed % items_with_weights.len() as u64) as usize);
    }
    // Use saturating_add to prevent panic on overflow, though unlikely with u64 weights
    let random_val = (seed % total_weight).saturating_add(1);
    let mut current_weight_sum = 0u64;
    for (index, (_, weight)) in items_with_weights.iter().enumerate() {
        current_weight_sum = current_weight_sum.saturating_add(*weight);
        if random_val <= current_weight_sum {
            return Some(index);
        }
    }
    // Should ideally not be reached if total_weight > 0
    warn!("Weighted random selection failed to select an index despite non-zero total weight. Returning last index.");
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
                 Some(event) => event.status == EventStatus::Published && event.start_time >= now,
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
        .filter(|e| e.status == EventStatus::Published && e.start_time > min_start_time_for_candidate)
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
use spacetimedb::{ReducerContext, Table};
use crate::tables::*;
use crate::enums::*;

pub fn get_group_permission(ctx: &ReducerContext, group_id: u64) -> Option<PermissionLevel> {
    ctx.db.group_membership().iter()
        .find(|m| m.user_identity == ctx.sender && m.group_id == group_id)
        .map(|m| m.permission_level)
}

pub fn check_permission(
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

pub fn is_event_host_staff_or_ceo(ctx: &ReducerContext, event_id: u64) -> Result<(), String> {
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

pub fn is_group_participating_in_event(ctx: &ReducerContext, group_id: u64, event_id: u64) -> bool {
     ctx.db.event_participant().iter()
        .any(|p| p.event_id == event_id && p.group_id == group_id)
}

// Helper to find a struct by PK and return Err if not found
pub fn find_event_or_err(ctx: &ReducerContext, event_id: u64) -> Result<Event, String> {
    ctx.db.event().event_id().find(event_id)
        .ok_or_else(|| format!("Event with ID {} not found", event_id))
}
pub fn find_group_or_err(ctx: &ReducerContext, group_id: u64) -> Result<Group, String> {
    ctx.db.group().group_id().find(group_id)
       .ok_or_else(|| format!("Group with ID {} not found", group_id))
}
pub fn find_sub_event_or_err(ctx: &ReducerContext, sub_event_id: u64) -> Result<SubEvent, String> {
    ctx.db.sub_event().sub_event_id().find(sub_event_id)
       .ok_or_else(|| format!("SubEvent with ID {} not found", sub_event_id))
}
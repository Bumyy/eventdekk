use spacetimedb::{reducer, ReducerContext, Table};
use log::info;
use crate::tables::{event, group,  live_chat_message, LiveChatMessage};

#[reducer]
pub fn add_live_chat_message(
    ctx: &ReducerContext, group_id: u64, event_id: u64, message: String,
) -> Result<(), String> {
    if message.len() > 500 { return Err("Message exceeds maximum length.".to_string()); }
    if ctx.db.event().event_id().find(event_id).is_none() { return Err(format!("Event {} not found.", event_id)); }
    if ctx.db.group().group_id().find(group_id).is_none() { return Err(format!("Group {} not found.", group_id)); }

    let chat_message = LiveChatMessage {
        message_id: 0, group_id, event_id, sender: ctx.sender,
        message, timestamp: ctx.timestamp,
    };
    ctx.db.live_chat_message().insert(chat_message);
    info!("Chat message added to event {}", event_id);
    Ok(())
}

#[reducer]
pub fn edit_live_chat_message(
    ctx: &ReducerContext, message_id: u64, new_message: String,
) -> Result<(), String> {
    if new_message.len() > 500 { return Err("Message too long.".to_string()); }
    let mut chat_message = ctx.db.live_chat_message().message_id().find(message_id)
        .ok_or_else(|| format!("Chat message {} not found.", message_id))?;

    if chat_message.sender != ctx.sender { return Err("Permission denied.".to_string()); }

    chat_message.message = new_message;
    ctx.db.live_chat_message().message_id().update(chat_message);
    Ok(())
}

#[reducer]
pub fn delete_live_chat_message(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let chat_message = ctx.db.live_chat_message().message_id().find(message_id)
        .ok_or_else(|| format!("Chat message {} not found.", message_id))?;

    if chat_message.sender != ctx.sender { return Err("Permission denied.".to_string()); }

    ctx.db.live_chat_message().message_id().delete(message_id);
    Ok(())
}
use crate::enums::ParticipantStatus;
use crate::reducers::event::{invite_group_to_event, respond_to_event_invitation};
use crate::tables::{event, event_participant, group, group_discord_webhook, Event, Group};
use spacetimedb::{http::Request, procedure, ProcedureContext, Timestamp};

const EVENT_BASE_URL: &str = "https://eventdekk.com";
const EVENTDEKK_NAME: &str = "Eventdekk";
const EVENTDEKK_LOGO_URL: &str = "https://cdn.discordapp.com/icons/1156491820944080926/ca34b4bc33234c7b7fba6a6f5e7529b7.webp?size=128&quality=lossless";

fn redact_webhook_url(url: &str) -> String {
    if let Some(idx) = url.find("/api/webhooks/") {
        let prefix = &url[..idx + "/api/webhooks/".len()];
        return format!("{}***", prefix);
    }
    "***".to_string()
}

fn hex_color_to_decimal(hex: Option<&String>) -> Option<i32> {
    let hex = hex?;
    let hex = hex.strip_prefix('#').unwrap_or(hex);
    i32::from_str_radix(hex, 16).ok()
}

fn events_conflict(start1: Timestamp, end1: Timestamp, start2: Timestamp, end2: Timestamp) -> bool {
    start1 < end2 && start2 < end1
}

fn check_group_conflicts_on_day(
    tx: &spacetimedb::TxContext,
    group_id: u64,
    event_start: Timestamp,
    event_end: Timestamp,
    exclude_event_id: u64,
) -> Option<(String, Timestamp, Timestamp)> {
    let participant_entries: Vec<_> = tx
        .db
        .event_participant()
        .idx_group()
        .filter(&group_id)
        .filter(|p| {
            p.status == ParticipantStatus::Accepted || p.status == ParticipantStatus::Pending
        })
        .collect();

    for participant in participant_entries {
        if participant.event_id == exclude_event_id {
            continue;
        }

        if let Some(other_event) = tx.db.event().event_id().find(participant.event_id) {
            if events_conflict(
                event_start,
                event_end,
                other_event.start_time,
                other_event.end_time,
            ) {
                return Some((
                    other_event.name,
                    other_event.start_time,
                    other_event.end_time,
                ));
            }
        }
    }

    None
}

fn format_discord_timestamp(ts: Timestamp) -> String {
    let secs = ts.to_micros_since_unix_epoch() / 1_000_000;
    format!("<t:{}:F>", secs)
}

fn format_discord_timestamp_relative(ts: Timestamp) -> String {
    let secs = ts.to_micros_since_unix_epoch() / 1_000_000;
    format!("<t:{}:R>", secs)
}

fn send_discord_webhook(
    ctx: &mut ProcedureContext,
    group_id: u64,
    payload_json: serde_json::Value,
) -> Result<(), String> {
    let webhook = ctx.with_tx(|tx| tx.db.group_discord_webhook().group_id().find(group_id));

    let Some(webhook) = webhook else {
        return Ok(());
    };

    if !webhook.enabled {
        return Ok(());
    }

    let body_json = payload_json.to_string();

    let request = Request::builder()
        .uri(&webhook.webhook_url)
        .method("POST")
        .header("Content-Type", "application/json")
        .body(body_json.into_bytes())
        .map_err(|e| format!("Failed to build Discord request: {e}"))?;

    let response = ctx
        .http
        .send(request)
        .map_err(|e| format!("Discord webhook request failed: {e:?}"))?;

    let (parts, body) = response.into_parts();
    if !parts.status.is_success() {
        let body_text = body.into_string_lossy();
        return Err(format!(
            "Discord webhook returned {} for group {} (url {}): {}",
            parts.status,
            group_id,
            redact_webhook_url(&webhook.webhook_url),
            body_text
        ));
    }

    Ok(())
}

#[procedure]
pub fn invite_group_to_event_and_notify(
    ctx: &mut ProcedureContext,
    event_id: u64,
    invited_group_id: u64,
) -> Result<(), String> {
    let details = ctx.try_with_tx(|tx| {
        invite_group_to_event(tx, event_id, invited_group_id)?;

        let event_row = tx
            .db
            .event()
            .event_id()
            .find(event_id)
            .ok_or_else(|| format!("Event {} not found after invite.", event_id))?;
        let invited_group_row = tx
            .db
            .group()
            .group_id()
            .find(invited_group_id)
            .ok_or_else(|| format!("Invited group {} not found.", invited_group_id))?;
        let host_group_row = tx
            .db
            .group()
            .group_id()
            .find(event_row.creator_group_id)
            .ok_or_else(|| {
                format!(
                    "Host group {} not found for event {}.",
                    event_row.creator_group_id, event_id
                )
            })?;

        let target_group_id = invited_group_row.group_id;

        let conflict = check_group_conflicts_on_day(
            tx,
            invited_group_id,
            event_row.start_time,
            event_row.end_time,
            event_id,
        );

        Ok::<
            (
                Event,
                Group,
                Group,
                Option<(String, Timestamp, Timestamp)>,
                u64,
            ),
            String,
        >((
            event_row,
            invited_group_row,
            host_group_row,
            conflict,
            target_group_id,
        ))
    })?;

    let (event_row, _invited_group, host_group, conflict, target_group_id) = details;

    let event_url = format!("{}/event/{}", EVENT_BASE_URL, event_id);
    let group_color = hex_color_to_decimal(host_group.color.as_ref());
    let group_color_value = group_color.unwrap_or(0);
    let host_logo = host_group
        .logo_url
        .as_ref()
        .map(|u| u.as_str())
        .unwrap_or(EVENTDEKK_LOGO_URL);

    let mut fields = vec![];

    if let Some((conflict_name, conflict_start, conflict_end)) = conflict {
        fields.push(serde_json::json!({
            "name": "⚠️ Schedule Conflict",
            "value": format!(
                "You have another event: **{}** ({} - {})",
                conflict_name,
                format_discord_timestamp(conflict_start),
                format_discord_timestamp_relative(conflict_end)
            ),
            "inline": false
        }));
    }

    let payload = serde_json::json!({
        "username": EVENTDEKK_NAME,
        "avatar_url": EVENTDEKK_LOGO_URL,
        "content": "🎉 **New Event Invitation**",
        "embeds": [
            {
                "author": {
                    "name": host_group.name,
                    "icon_url": host_logo
                },
                "title": event_row.name,
                "url": event_url,
                "description": format!("<t:{}:F>", event_row.start_time.to_micros_since_unix_epoch() / 1_000_000),
                "color": group_color_value,
                "thumbnail": event_row.banner_url.as_ref().map(|url| serde_json::json!({
                    "url": url
                })),
                "fields": fields
            }
        ]
    });

    send_discord_webhook(ctx, target_group_id, payload)
}

#[procedure]
pub fn respond_to_event_invitation_and_notify(
    ctx: &mut ProcedureContext,
    event_id: u64,
    group_id: u64,
    response: ParticipantStatus,
) -> Result<(), String> {
    if response == ParticipantStatus::Pending {
        return Err("Invalid response: Cannot set status back to Pending.".to_string());
    }

    let details =
        ctx.try_with_tx(|tx| {
            respond_to_event_invitation(tx, event_id, group_id, response)?;

            let event_row =
                tx.db.event().event_id().find(event_id).ok_or_else(|| {
                    format!("Event {} not found after response update.", event_id)
                })?;
            let responding_group_row = tx
                .db
                .group()
                .group_id()
                .find(group_id)
                .ok_or_else(|| format!("Group {} not found.", group_id))?;
            let host_group_row = tx
                .db
                .group()
                .group_id()
                .find(event_row.creator_group_id)
                .ok_or_else(|| {
                    format!(
                        "Host group {} not found for event {}.",
                        event_row.creator_group_id, event_id
                    )
                })?;

            let target_group_id = host_group_row.group_id;

            Ok::<(Event, Group, Group, u64), String>((
                event_row,
                responding_group_row,
                host_group_row,
                target_group_id,
            ))
        })?;

    let (event_row, responding_group, _host_group, target_group_id) = details;

    let event_url = format!("{}/event/{}", EVENT_BASE_URL, event_id);
    let group_color = hex_color_to_decimal(responding_group.color.as_ref());
    let group_color_value = group_color.unwrap_or(0);
    let group_logo = responding_group
        .logo_url
        .as_ref()
        .map(|u| u.as_str())
        .unwrap_or(EVENTDEKK_LOGO_URL);

    let (emoji, action) = match response {
        ParticipantStatus::Accepted => ("✅", "accepted"),
        ParticipantStatus::Declined => ("❌", "declined"),
        ParticipantStatus::Pending => ("⏳", "pending"),
    };

    let payload = serde_json::json!({
        "username": EVENTDEKK_NAME,
        "avatar_url": EVENTDEKK_LOGO_URL,
        "content": format!("{} **{} ({})** has **{}** your invitation", emoji, responding_group.name, responding_group.tag, action),
        "embeds": [
            {
                "author": {
                    "name": format!("{} ({})", responding_group.name, responding_group.tag),
                    "icon_url": group_logo
                },
                "title": event_row.name,
                "url": event_url,
                "description": format!("<t:{}:F>", event_row.start_time.to_micros_since_unix_epoch() / 1_000_000),
                "color": group_color_value,
                "thumbnail": event_row.banner_url.as_ref().map(|url| serde_json::json!({
                    "url": url
                }))
            }
        ]
    });

    send_discord_webhook(ctx, target_group_id, payload)
}

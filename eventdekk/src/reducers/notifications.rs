use crate::enums::ParticipantStatus;
use crate::reducers::event::{invite_group_to_event, respond_to_event_invitation};
use crate::tables::{event, group, group_discord_webhook};
use serde_json::json;
use spacetimedb::{http::Request, procedure, ProcedureContext};

const EVENT_BASE_URL: &str = "https://eventdekk.com";

fn redact_webhook_url(url: &str) -> String {
    if let Some(idx) = url.find("/api/webhooks/") {
        let prefix = &url[..idx + "/api/webhooks/".len()];
        return format!("{}***", prefix);
    }
    "***".to_string()
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

        Ok::<(String, String, String, String, u64), String>((
            event_row.name,
            invited_group_row.name,
            invited_group_row.tag,
            host_group_row.name,
            invited_group_row.group_id,
        ))
    })?;

    let (event_name, invited_group_name, invited_group_tag, host_group_name, target_group_id) =
        details;

    let event_url = format!("{}/event/{}", EVENT_BASE_URL, event_id);

    let payload = json!({
        "content": format!(
            "Event invitation for **{} ({})**\nYou were invited by **{}**.",
            invited_group_name, invited_group_tag, host_group_name
        ),
        "embeds": [
            {
                "title": event_name,
                "url": event_url,
                "description": "Open event details",
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

            Ok::<(String, String, String, String, u64), String>((
                event_row.name,
                responding_group_row.name,
                responding_group_row.tag,
                host_group_row.name,
                host_group_row.group_id,
            ))
        })?;

    let (event_name, responding_group_name, responding_group_tag, host_group_name, target_group_id) =
        details;

    let event_url = format!("{}/event/{}", EVENT_BASE_URL, event_id);

    let response_label = match response {
        ParticipantStatus::Accepted => "accepted",
        ParticipantStatus::Declined => "declined",
        ParticipantStatus::Pending => "pending",
    };

    let payload = json!({
        "content": format!(
            "Invitation update for **{}**\n**{} ({})** has **{}** your invitation.",
            host_group_name, responding_group_name, responding_group_tag, response_label
        ),
        "embeds": [
            {
                "title": event_name,
                "url": event_url,
                "description": "Open event details",
            }
        ]
    });

    send_discord_webhook(ctx, target_group_id, payload)
}

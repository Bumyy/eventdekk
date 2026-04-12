use crate::enums::PermissionLevel;
use crate::tables::{
    discovery_event__query, event__query, group__view, group_discord_webhook__view,
    group_membership__view, DiscoveryEvent, GroupDiscordWebhook,
};
use spacetimedb::{AnonymousViewContext, Identity, Query, SpacetimeType, Timestamp, ViewContext};

#[spacetimedb::view(name = discovery_feed, public)]
pub fn discovery_feed(ctx: &AnonymousViewContext) -> Query<DiscoveryEvent> {
    ctx.from
        .discovery_event()
        .left_semijoin(ctx.from.event(), |de, e| de.event_id.eq(e.event_id))
        .build()
}

#[derive(SpacetimeType, Clone, Debug)]
pub struct GroupDiscordWebhookAdminView {
    pub group_id: u64,
    pub webhook_url: String,
    pub enabled: bool,
    pub updated_at: Timestamp,
    pub updated_by: Option<Identity>,
}

#[spacetimedb::view(name = my_group_discord_webhooks, public)]
pub fn my_group_discord_webhooks(ctx: &ViewContext) -> Vec<GroupDiscordWebhookAdminView> {
    let sender = ctx.sender;
    let mut allowed_group_ids = Vec::new();

    for group in ctx.db.group().idx_ceo().filter(&sender) {
        allowed_group_ids.push(group.group_id);
    }

    for membership in ctx.db.group_membership().idx_user().filter(&sender) {
        if membership.permission_level == PermissionLevel::CEO
            && !allowed_group_ids.contains(&membership.group_id)
        {
            allowed_group_ids.push(membership.group_id);
        }
    }

    let mut result = Vec::new();
    for group_id in allowed_group_ids {
        if let Some(GroupDiscordWebhook {
            group_id,
            webhook_url,
            enabled,
            updated_at,
            updated_by,
        }) = ctx.db.group_discord_webhook().group_id().find(group_id)
        {
            result.push(GroupDiscordWebhookAdminView {
                group_id,
                webhook_url,
                enabled,
                updated_at,
                updated_by,
            });
        }
    }

    result
}

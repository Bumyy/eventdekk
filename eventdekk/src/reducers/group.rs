use crate::enums::{ApplicationStatus, PermissionLevel};
use crate::tables::{
    group, group_application, group_callsign_filter, group_discord_webhook, group_membership,
    super_admin, user, Group, GroupApplication, GroupCallsignFilter, GroupDiscordWebhook,
    GroupMembership, SuperAdmin,
};
use crate::utils::{check_permission, find_group_or_err};
use log::info;
use spacetimedb::{reducer, Identity, ReducerContext, Table};

fn is_super_admin(ctx: &ReducerContext, identity: Identity) -> bool {
    ctx.db.super_admin().identity().find(identity).is_some()
}

fn require_super_admin(ctx: &ReducerContext) -> Result<(), String> {
    if ctx.db.super_admin().iter().next().is_none() {
        ctx.db.super_admin().insert(SuperAdmin {
            identity: ctx.sender,
            granted_at: ctx.timestamp,
            granted_by: None,
        });
        info!("Bootstrap super admin initialized: {:?}", ctx.sender);
        return Ok(());
    }

    if is_super_admin(ctx, ctx.sender) {
        Ok(())
    } else {
        Err("Only super admins can perform this action.".to_string())
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn validate_discord_webhook_url(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("Webhook URL cannot be empty.".to_string());
    }

    let is_discord_webhook = (trimmed.starts_with("https://discord.com/api/webhooks/")
        || trimmed.starts_with("https://ptb.discord.com/api/webhooks/")
        || trimmed.starts_with("https://canary.discord.com/api/webhooks/"))
        && trimmed.len() > "https://discord.com/api/webhooks/".len();

    if !is_discord_webhook {
        return Err("Webhook URL must be a valid Discord webhook URL.".to_string());
    }

    Ok(trimmed.to_string())
}

fn validate_group_fields(
    ctx: &ReducerContext,
    name: &str,
    tag: &str,
    exclude_group_id: Option<u64>,
) -> Result<(), String> {
    if name.trim().is_empty() || tag.trim().is_empty() {
        return Err("Group name and tag cannot be empty.".to_string());
    }

    let normalized_tag = tag.trim().to_lowercase();
    let tag_conflict = ctx.db.group().iter().any(|g| {
        if exclude_group_id.is_some() && Some(g.group_id) == exclude_group_id {
            return false;
        }
        g.tag.trim().eq_ignore_ascii_case(&normalized_tag)
    });

    if tag_conflict {
        return Err(format!("Group tag '{}' already exists.", tag.trim()));
    }

    Ok(())
}

fn create_group_with_ceo_membership(
    ctx: &ReducerContext,
    ceo_identity: Identity,
    name: String,
    tag: String,
    description: String,
    website_url: Option<String>,
    logo_url: Option<String>,
    ifvarb_approved: bool,
) -> Group {
    let new_group = Group {
        group_id: 0,
        name,
        tag,
        description,
        ceo_identity,
        ifvarb_approved,
        website_url,
        logo_url,
        rating: None,
        created_at: ctx.timestamp,
        color: None,
    };

    let inserted_group = ctx.db.group().insert(new_group);

    let ceo_membership = GroupMembership {
        membership_id: 0,
        user_identity: ceo_identity,
        group_id: inserted_group.group_id,
        permission_level: PermissionLevel::CEO,
    };
    ctx.db.group_membership().insert(ceo_membership);

    inserted_group
}

#[reducer]
pub fn grant_super_admin(ctx: &ReducerContext, identity: Identity) -> Result<(), String> {
    require_super_admin(ctx)?;

    if ctx.db.super_admin().identity().find(identity).is_some() {
        return Err("Identity is already a super admin.".to_string());
    }

    ctx.db.super_admin().insert(SuperAdmin {
        identity,
        granted_at: ctx.timestamp,
        granted_by: Some(ctx.sender),
    });

    info!("Super admin {:?} granted by {:?}", identity, ctx.sender);
    Ok(())
}

#[reducer]
pub fn revoke_super_admin(ctx: &ReducerContext, identity: Identity) -> Result<(), String> {
    require_super_admin(ctx)?;

    if identity == ctx.sender {
        return Err("You cannot revoke your own super admin access.".to_string());
    }

    if ctx.db.super_admin().identity().delete(identity) {
        info!("Super admin {:?} revoked by {:?}", identity, ctx.sender);
        Ok(())
    } else {
        Err("Identity is not a super admin.".to_string())
    }
}

#[reducer]
pub fn apply_for_group(
    ctx: &ReducerContext,
    name: String,
    tag: String,
    description: String,
    website_url: Option<String>,
    logo_url: Option<String>,
) -> Result<(), String> {
    validate_group_fields(ctx, &name, &tag, None)?;

    if ctx
        .db
        .group_application()
        .iter()
        .any(|a| a.applicant_identity == ctx.sender && a.status == ApplicationStatus::Pending)
    {
        return Err("You already have a pending group application.".to_string());
    }

    let application = GroupApplication {
        application_id: 0,
        applicant_identity: ctx.sender,
        name: name.trim().to_string(),
        tag: tag.trim().to_string(),
        description: description.trim().to_string(),
        website_url: normalize_optional_string(website_url),
        logo_url: normalize_optional_string(logo_url),
        status: ApplicationStatus::Pending,
        reviewed_by: None,
        reviewed_at: None,
        review_note: None,
        created_group_id: None,
        created_at: ctx.timestamp,
    };

    let inserted = ctx.db.group_application().insert(application);
    info!(
        "Group application {} submitted by {:?}",
        inserted.application_id, ctx.sender
    );
    Ok(())
}

#[reducer]
pub fn approve_group_application(
    ctx: &ReducerContext,
    application_id: u64,
    review_note: Option<String>,
) -> Result<(), String> {
    require_super_admin(ctx)?;

    let mut application = ctx
        .db
        .group_application()
        .application_id()
        .find(application_id)
        .ok_or_else(|| format!("Group application {} not found.", application_id))?;

    if application.status != ApplicationStatus::Pending {
        return Err("Only pending applications can be approved.".to_string());
    }

    validate_group_fields(ctx, &application.name, &application.tag, None)?;

    let inserted_group = create_group_with_ceo_membership(
        ctx,
        application.applicant_identity,
        application.name.clone(),
        application.tag.clone(),
        application.description.clone(),
        application.website_url.clone(),
        application.logo_url.clone(),
        true,
    );

    application.status = ApplicationStatus::Approved;
    application.reviewed_by = Some(ctx.sender);
    application.reviewed_at = Some(ctx.timestamp);
    application.review_note = normalize_optional_string(review_note);
    application.created_group_id = Some(inserted_group.group_id);

    ctx.db
        .group_application()
        .application_id()
        .update(application);

    info!(
        "Group application {} approved by {:?}, created group {}",
        application_id, ctx.sender, inserted_group.group_id
    );
    Ok(())
}

#[reducer]
pub fn reject_group_application(
    ctx: &ReducerContext,
    application_id: u64,
    review_note: Option<String>,
) -> Result<(), String> {
    require_super_admin(ctx)?;

    let mut application = ctx
        .db
        .group_application()
        .application_id()
        .find(application_id)
        .ok_or_else(|| format!("Group application {} not found.", application_id))?;

    if application.status != ApplicationStatus::Pending {
        return Err("Only pending applications can be rejected.".to_string());
    }

    application.status = ApplicationStatus::Rejected;
    application.reviewed_by = Some(ctx.sender);
    application.reviewed_at = Some(ctx.timestamp);
    application.review_note = normalize_optional_string(review_note);

    ctx.db
        .group_application()
        .application_id()
        .update(application);

    info!(
        "Group application {} rejected by {:?}",
        application_id, ctx.sender
    );
    Ok(())
}

#[reducer]
pub fn register_group(
    ctx: &ReducerContext,
    name: String,
    tag: String,
    description: String,
    website_url: Option<String>,
    logo_url: Option<String>,
) -> Result<(), String> {
    require_super_admin(ctx)?;
    validate_group_fields(ctx, &name, &tag, None)?;

    let inserted_group = create_group_with_ceo_membership(
        ctx,
        ctx.sender,
        name.trim().to_string(),
        tag.trim().to_string(),
        description.trim().to_string(),
        normalize_optional_string(website_url),
        normalize_optional_string(logo_url),
        true,
    );

    info!(
        "Group '{}' registered directly by super admin {:?}",
        inserted_group.name, ctx.sender
    );
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
    let sender_is_super_admin = is_super_admin(ctx, ctx.sender);
    if !sender_is_super_admin {
        check_permission(ctx, group_id, PermissionLevel::Staff)?;
    }

    let mut group = find_group_or_err(ctx, group_id)?;

    let trimmed_name = name.trim().to_string();
    let trimmed_tag = tag.trim().to_string();

    if sender_is_super_admin {
        validate_group_fields(ctx, &trimmed_name, &trimmed_tag, Some(group_id))?;
        group.name = trimmed_name;
        group.tag = trimmed_tag;
    } else if group.name.trim() != trimmed_name || group.tag.trim() != trimmed_tag {
        return Err("Only super admins can change group name or tag.".to_string());
    }

    group.description = description.trim().to_string();
    group.website_url = normalize_optional_string(website_url);
    group.logo_url = normalize_optional_string(logo_url);
    group.color = normalize_optional_string(color);

    ctx.db.group().group_id().update(group);
    info!("Group {} updated by user {:?}", group_id, ctx.sender);
    Ok(())
}

#[reducer]
pub fn set_group_discord_webhook(
    ctx: &ReducerContext,
    group_id: u64,
    webhook_url: String,
    enabled: bool,
) -> Result<(), String> {
    let group = find_group_or_err(ctx, group_id)?;

    let sender_is_super_admin = is_super_admin(ctx, ctx.sender);
    let sender_is_primary_ceo = group.ceo_identity == ctx.sender;
    let sender_is_membership_ceo = check_permission(ctx, group_id, PermissionLevel::CEO).is_ok();

    if !sender_is_super_admin && !sender_is_primary_ceo && !sender_is_membership_ceo {
        return Err(
            "Only the group CEO (or super admin) can manage Discord webhook settings.".to_string(),
        );
    }

    let webhook_url = validate_discord_webhook_url(&webhook_url)?;

    if let Some(mut existing) = ctx.db.group_discord_webhook().group_id().find(group_id) {
        let webhook_changed = existing.webhook_url != webhook_url;
        existing.webhook_url = webhook_url;
        existing.enabled = if webhook_changed { true } else { enabled };
        existing.updated_at = ctx.timestamp;
        existing.updated_by = Some(ctx.sender);
        ctx.db.group_discord_webhook().group_id().update(existing);
    } else {
        ctx.db.group_discord_webhook().insert(GroupDiscordWebhook {
            group_id,
            webhook_url,
            enabled: true,
            updated_at: ctx.timestamp,
            updated_by: Some(ctx.sender),
        });
    }

    info!(
        "Discord webhook updated for group {} by user {:?} (enabled={})",
        group_id, ctx.sender, enabled
    );
    Ok(())
}

#[reducer]
pub fn add_group_member(
    ctx: &ReducerContext,
    group_id: u64,
    user_identity: Identity,
    permission_level: PermissionLevel,
) -> Result<(), String> {
    match permission_level {
        PermissionLevel::Member => {
            check_permission(ctx, group_id, PermissionLevel::Staff)?;
        }
        PermissionLevel::Staff | PermissionLevel::CEO => {
            check_permission(ctx, group_id, PermissionLevel::CEO)?;
            if permission_level == PermissionLevel::CEO {
                if let Some(group) = ctx.db.group().group_id().find(group_id) {
                    if ctx.sender != group.ceo_identity {
                        return Err("Only the group CEO can assign CEO role.".to_string());
                    }
                } else {
                    return Err(format!("Group {} not found.", group_id));
                }
            }
        }
    }

    if ctx.db.user().identity().find(user_identity).is_none() {
        return Err(format!("User {:?} does not exist.", user_identity));
    }

    if ctx
        .db
        .group_membership()
        .iter()
        .any(|m| m.user_identity == user_identity && m.group_id == group_id)
    {
        return Err(format!(
            "User {:?} is already a member of group {}.",
            user_identity, group_id
        ));
    }

    let new_membership = GroupMembership {
        membership_id: 0,
        user_identity,
        group_id,
        permission_level,
    };
    ctx.db.group_membership().insert(new_membership);

    info!(
        "User {:?} added to group {} with level {:?} by user {:?}",
        user_identity, group_id, permission_level, ctx.sender
    );
    Ok(())
}

#[reducer]
pub fn remove_group_member(
    ctx: &ReducerContext,
    group_id: u64,
    user_identity: Identity,
) -> Result<(), String> {
    check_permission(ctx, group_id, PermissionLevel::Staff)?;

    let group = find_group_or_err(ctx, group_id)?;
    if user_identity == group.ceo_identity {
        return Err(
            "Cannot remove the primary CEO via this function. Use transfer_ceo.".to_string(),
        );
    }

    let membership_to_delete = ctx
        .db
        .group_membership()
        .iter()
        .find(|m| m.user_identity == user_identity && m.group_id == group_id);

    if let Some(membership) = membership_to_delete {
        if membership.permission_level as u8 >= PermissionLevel::Staff as u8 {
            check_permission(ctx, group_id, PermissionLevel::CEO)?;
        }

        ctx.db
            .group_membership()
            .membership_id()
            .delete(membership.membership_id);
        info!(
            "User {:?} removed from group {} by user {:?}",
            user_identity, group_id, ctx.sender
        );
        Ok(())
    } else {
        Err(format!(
            "User {:?} is not a member of group {}.",
            user_identity, group_id
        ))
    }
}

#[reducer]
pub fn add_group_callsign_filter(
    ctx: &ReducerContext,
    group_id: u64,
    words: String,
    color: Option<String>,
    label: Option<String>,
) -> Result<(), String> {
    let sender_is_super_admin = is_super_admin(ctx, ctx.sender);
    if !sender_is_super_admin {
        check_permission(ctx, group_id, PermissionLevel::Staff)?;
    }

    let trimmed = words.trim();
    if trimmed.is_empty() {
        return Err("Callsign filter words cannot be empty.".to_string());
    }

    let filter = GroupCallsignFilter {
        filter_id: 0,
        group_id,
        words: trimmed.to_string(),
        created_at: ctx.timestamp,
        color,
        label,
    };
    ctx.db.group_callsign_filter().insert(filter);
    info!("Callsign filter '{}' added to group {}", trimmed, group_id);
    Ok(())
}

#[reducer]
pub fn remove_group_callsign_filter(ctx: &ReducerContext, filter_id: u64) -> Result<(), String> {
    let filter = ctx
        .db
        .group_callsign_filter()
        .filter_id()
        .find(filter_id)
        .ok_or_else(|| format!("Callsign filter {} not found.", filter_id))?;

    let sender_is_super_admin = is_super_admin(ctx, ctx.sender);
    if !sender_is_super_admin {
        check_permission(ctx, filter.group_id, PermissionLevel::Staff)?;
    }

    ctx.db.group_callsign_filter().filter_id().delete(filter_id);
    info!(
        "Callsign filter {} removed from group {}",
        filter_id, filter.group_id
    );
    Ok(())
}

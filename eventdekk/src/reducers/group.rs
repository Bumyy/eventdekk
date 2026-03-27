use crate::enums::PermissionLevel;
use crate::tables::{group, group_membership, user, Group, GroupMembership};
use crate::utils::{check_permission, find_group_or_err};
use log::info;
use spacetimedb::{reducer, Identity, ReducerContext, Table};

#[reducer]
pub fn register_group(
    ctx: &ReducerContext,
    name: String,
    tag: String,
    description: String,
    website_url: Option<String>,
    logo_url: Option<String>,
) -> Result<(), String> {
    let ceo_identity = ctx.sender;

    if name.trim().is_empty() || tag.trim().is_empty() {
        return Err("Group name and tag cannot be empty.".to_string());
    }
    if ctx.db.group().iter().any(|g| g.tag == tag) {
        return Err(format!("Group tag '{}' already exists.", tag));
    }

    let new_group = Group {
        group_id: 0,
        name,
        tag,
        description,
        ceo_identity,
        ifvarb_approved: true, // Assumed pre-approved
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

    info!(
        "Group '{}' registered by CEO {:?}",
        inserted_group.name, ceo_identity
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
    check_permission(ctx, group_id, PermissionLevel::Staff)?;
    let mut group = find_group_or_err(ctx, group_id)?;

    if name.trim().is_empty() {
        return Err("Group name cannot be empty.".to_string());
    }

    group.name = name;
    group.tag = tag;
    group.description = description;
    group.website_url = website_url;
    group.logo_url = logo_url;
    group.color = color;

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

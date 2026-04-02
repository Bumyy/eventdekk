use crate::tables::{user, User};
use log::{info, warn};
use spacetimedb::{reducer, ReducerContext, Table};

#[reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    if let Some(user) = ctx.db.user().identity().find(identity) {
        info!("User reconnected: {:?}", identity);
        ctx.db.user().identity().update(User {
            online: true,
            ..user
        });
    } else {
        info!("New user connected: {:?}", identity);
        ctx.db.user().insert(User {
            identity,
            display_name: None,
            ifc_profile_url: None,
            online: true,
            ifc_callsign_prefix: None,
            timezone: None,
        });
    }
}

#[reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    if let Some(user) = ctx.db.user().identity().find(identity) {
        info!("User disconnected: {:?}", identity);
        ctx.db.user().identity().update(User {
            online: false,
            ..user
        });
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

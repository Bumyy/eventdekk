use crate::tables::{discovery_event, Event};
use spacetimedb::{AnonymousViewContext, Identity, Query, Table, ViewContext};

#[spacetimedb::view(name = discovery_feed, public)]
pub fn discovery_feed(ctx: &AnonymousViewContext) -> Query<Event> {
    ctx.from
        .discovery_events()
        // Join DiscoveryEvents with Events on event_id
        .left_semijoin(ctx.from.events(), |(de, e)| de.event_id.eq(e.event_id))
        // Note: Sort logic usually happens in the query or client,
        // but joining here saves you from manually mapping IDs in React.
        .build()
}

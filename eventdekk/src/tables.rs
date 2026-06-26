use crate::enums::*;
use spacetimedb::{table, Identity, ScheduleAt, SpacetimeType, Timestamp};

#[table(name = super_admin, public)]
pub struct SuperAdmin {
    #[primary_key]
    pub identity: Identity,
    pub granted_at: Timestamp,
    pub granted_by: Option<Identity>,
}

#[table(name = group_application, public,
    index(name = idx_applicant, btree(columns = [applicant_identity])),
    index(name = idx_status, btree(columns = [status]))
)]
pub struct GroupApplication {
    #[primary_key]
    #[auto_inc]
    pub application_id: u64,
    pub applicant_identity: Identity,
    pub name: String,
    pub tag: String,
    pub description: String,
    pub website_url: Option<String>,
    pub logo_url: Option<String>,
    pub status: ApplicationStatus,
    pub reviewed_by: Option<Identity>,
    pub reviewed_at: Option<Timestamp>,
    pub review_note: Option<String>,
    pub created_group_id: Option<u64>,
    pub created_at: Timestamp,
}

#[table(name = group, public, index(name = idx_ceo, btree(columns = [ceo_identity])))]
pub struct Group {
    #[primary_key]
    #[auto_inc]
    pub group_id: u64,
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
    #[primary_key]
    #[auto_inc]
    pub membership_id: u64,
    pub user_identity: Identity,
    pub group_id: u64,
    pub permission_level: PermissionLevel,
}

#[table(name = group_callsign_filter, public,
    index(name = idx_group, btree(columns = [group_id]))
)]
pub struct GroupCallsignFilter {
    #[primary_key]
    #[auto_inc]
    pub filter_id: u64,
    pub group_id: u64,
    pub words: String,
    pub created_at: Timestamp,
    #[default(None::<String>)]
    pub color: Option<String>,
    #[default(None::<String>)]
    pub label: Option<String>,
}

#[table(name = user, public, index(name = idx_callsign_prefix, btree(columns = [ifc_callsign_prefix])))]
pub struct User {
    #[primary_key]
    pub identity: Identity,
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
    #[primary_key]
    #[auto_inc]
    pub event_id: u64,
    pub creator_group_id: u64,
    pub name: String,
    pub description: String,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub ifc_event_link: Option<String>,
    pub banner_url: Option<String>,
    pub status: EventStatus,
    pub created_at: Timestamp,
    pub is_internal: bool,
    #[default(None::<String>)]
    pub flight_filter_mode: Option<String>,
    #[default(None::<String>)]
    pub flight_filter_bounds: Option<String>,
    #[default(false)]
    pub show_all_flights: bool,
}

#[table(name = event_participant, public,
    index(name = idx_event, btree(columns = [event_id])),
    index(name = idx_group, btree(columns = [group_id])),
    index(name = idx_event_group, btree(columns = [event_id, group_id]))
)]
pub struct EventParticipant {
    #[primary_key]
    #[auto_inc]
    pub participation_id: u64,
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
    #[primary_key]
    #[auto_inc]
    pub sub_event_id: u64,
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
    pub event_lead: Option<Identity>,
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
    pub event_lead: Option<Identity>,
}

#[table(name = flight_signup, public,
    index(name = idx_sub_event, btree(columns = [sub_event_id])),
    index(name = idx_group, btree(columns = [group_id])),
    index(name = idx_callsign, btree(columns = [callsign]))
)]
pub struct FlightSignup {
    #[primary_key]
    #[auto_inc]
    pub signup_id: u64,
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
    #[default(None::<Identity>)]
    pub event_lead: Option<Identity>,
    #[default(None::<String>)]
    pub livery_id: Option<String>,
}

#[table(name = live_flight, public,
    index(name = idx_event, btree(columns = [event_id])),
    index(name = idx_sub_event, btree(columns = [sub_event_id])),
)]
pub struct LiveFlight {
    #[primary_key]
    pub flight_id: String,
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

#[table(name = live_chat_message, public, index(name = idx_event_id, btree(columns = [event_id])))]
pub struct LiveChatMessage {
    #[primary_key]
    #[auto_inc]
    pub message_id: u64,
    pub sender: Identity,
    pub group_id: u64,
    pub event_id: u64,
    pub message: String,
    pub timestamp: Timestamp,
}

#[table(name = discovery_event, public, index(name = idx_priority, btree(columns = [display_priority])))]
#[derive(Clone)]
pub struct DiscoveryEvent {
    #[primary_key]
    pub event_id: u64,
    pub display_priority: u64,
    pub added_at: Timestamp,
}

#[table(name = group_discord_webhook,
    index(name = idx_updated_at, btree(columns = [updated_at]))
)]
pub struct GroupDiscordWebhook {
    #[primary_key]
    pub group_id: u64,
    pub webhook_url: String,
    pub enabled: bool,
    pub updated_at: Timestamp,
    pub updated_by: Option<Identity>,
}

#[table(name = discovery_rotation_schedule, scheduled(crate::reducers::discovery::rotate_discovery_event))]
#[derive(Clone, Copy)]
pub struct DiscoveryRotationSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

#[table(name = event_overlay, public, index(name = idx_event, btree(columns = [event_id])))]
pub struct EventOverlay {
    #[primary_key]
    #[auto_inc]
    pub overlay_id: u64,
    pub event_id: u64,
    pub name: String,
    pub overlay_type: String, // "kml", "image", "draw"
    pub data: String,         // KML string or Image URL or GeoJSON string
    pub config: String,       // JSON options (opacity, image bounds, styles, etc.)
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

use crate::enums::*;
use crate::tables::*;
use serde_json::json;
use spacetimedb::http::{Body, HandlerContext, Request, Response, Router};
use spacetimedb::Timestamp;

fn micros(t: Timestamp) -> i64 {
    t.to_micros_since_unix_epoch()
}

fn event_status_str(s: EventStatus) -> &'static str {
    match s {
        EventStatus::Draft => "Draft",
        EventStatus::Published => "Published",
        EventStatus::InProgress => "InProgress",
        EventStatus::Completed => "Completed",
        EventStatus::Cancelled => "Cancelled",
    }
}

fn sub_event_type_str(t: SubEventType) -> &'static str {
    match t {
        SubEventType::FlyIn => "FlyIn",
        SubEventType::FlyOut => "FlyOut",
        SubEventType::GroupFlight => "GroupFlight",
    }
}

#[spacetimedb::http::handler]
fn upcoming_events(ctx: &mut HandlerContext, _request: Request) -> Response {
    let events_json = ctx.with_tx(|tx| {
        tx.db
            .event()
            .iter()
            .filter(|e| {
                !e.is_internal
                    && matches!(e.status, EventStatus::Published | EventStatus::InProgress)
            })
            .map(|event| {
                let sub_events: Vec<SubEvent> = tx
                    .db
                    .sub_event()
                    .iter()
                    .filter(|se| se.event_id == event.event_id)
                    .collect();

                let sub_events_json: Vec<_> = sub_events
                    .iter()
                    .map(|sub_event| {
                        let signups_json: Vec<_> = tx
                            .db
                            .flight_signup()
                            .iter()
                            .filter(|fs| fs.sub_event_id == sub_event.sub_event_id)
                            .map(|fs| {
                                json!({
                                    "signup_id": fs.signup_id,
                                    "group_id": fs.group_id,
                                    "departure_icao": fs.departure_icao,
                                    "arrival_icao": fs.arrival_icao,
                                    "route_details": fs.route_details,
                                    "callsign": fs.callsign,
                                    "aircraft_type": fs.aircraft_type,
                                    "desired_departure_time": fs.desired_departure_time.map(micros),
                                    "desired_arrival_time": fs.desired_arrival_time.map(micros),
                                    "created_at": micros(fs.created_at),
                                    "livery_id": fs.livery_id,
                                })
                            })
                            .collect();

                        json!({
                            "sub_event_id": sub_event.sub_event_id,
                            "event_id": sub_event.event_id,
                            "name": sub_event.name,
                            "description": sub_event.description,
                            "type": sub_event_type_str(sub_event.sub_event_type),
                            "scheduled_start_time": micros(sub_event.scheduled_start_time),
                            "scheduled_end_time": micros(sub_event.scheduled_end_time),
                            "hub_icao": sub_event.hub_icao,
                            "group_flight_departure_icao": sub_event.group_flight_departure_icao,
                            "group_flight_arrival_icao": sub_event.group_flight_arrival_icao,
                            "group_flight_route": sub_event.group_flight_route,
                            "notes": sub_event.notes,
                            "flight_signups": signups_json,
                        })
                    })
                    .collect();

                json!({
                    "event_id": event.event_id,
                    "creator_group_id": event.creator_group_id,
                    "name": event.name,
                    "description": event.description,
                    "start_time": micros(event.start_time),
                    "end_time": micros(event.end_time),
                    "ifc_event_link": event.ifc_event_link,
                    "banner_url": event.banner_url,
                    "status": event_status_str(event.status),
                    "created_at": micros(event.created_at),
                    "sub_events": sub_events_json,
                })
            })
            .collect::<Vec<_>>()
    });

    let body = serde_json::to_string(&events_json)
        .unwrap_or_else(|e| format!("{{\"error\":\"{}\"}}", e));

    Response::builder()
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::from_bytes(body))
        .unwrap()
}

#[spacetimedb::http::router]
fn router() -> Router {
    Router::new().get("/upcoming", upcoming_events)
}

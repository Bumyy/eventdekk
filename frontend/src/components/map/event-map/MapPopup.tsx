import React from "react";
import { Popup } from "react-map-gl/maplibre";
import { SubEventType } from "@/module_bindings/types";
import { EventMapFlight, ActivePopupInfo, EventMapPopupContext } from "./types";
import "./popup.css";

export const MapPopup: React.FC<{
  activePopupInfo: ActivePopupInfo;
  setActivePopupInfo: (info: ActivePopupInfo) => void;
  context: EventMapPopupContext;
}> = ({ activePopupInfo, setActivePopupInfo, context }) => {
  if (!activePopupInfo) return null;
  const { type, data, longitude, latitude } = activePopupInfo;

  const PopupContainer: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <div className="event-map-popup-content">
      <h3 className="font-semibold text-base mb-2">{title}</h3>
      {children}
    </div>
  );

  let content: React.ReactNode = null;

  if (type === "airport") {
    const { airport, subEvent, isHub } = data;
    const typeLabel = isHub
      ? subEvent.subEventType.tag === SubEventType.FlyIn.tag
        ? "Fly-In Hub"
        : "Fly-Out Hub"
      : "Airport";

    content = (
      <PopupContainer title={`${airport.name} (${airport.icao})`}>
        <p>
          {typeLabel} for: {subEvent.name}
        </p>
        <p>
          Time: {context.formatTimeRange(subEvent.scheduledStartTime, subEvent.scheduledEndTime)}
        </p>
      </PopupContainer>
    );
  }

  if (type === "flight") {
    const flight = data as EventMapFlight;
    content = (
      <PopupContainer title={flight.callsign}>
        <p>Altitude: {Math.round(flight.altitude)} ft</p>
        <p>Speed: {Math.round(flight.ground_speed)} kts</p>
        <p>Heading: {Math.round(flight.heading)}°</p>
      </PopupContainer>
    );
  }

  if (type === "route") {
    const routeSubEventId = data.subEventId as string;
    const depIcao = data.depIcao as string;
    const arrIcao = data.arrIcao as string;
    const signupId = data.signupId as string | undefined;
    const groupId = data.groupId as string | undefined;

    const routeSubEvent = context.subEvents.find(
      (se) => se.subEventId.toString() === routeSubEventId
    );
    const routeDepAirport = context.getAirport(depIcao);
    const routeArrAirport = context.getAirport(arrIcao);
    const routeSignup = signupId
      ? context.flightSignups.find((fs) => fs.signupId.toString() === signupId)
      : null;
    const routeGroup = groupId ? context.groupMap.get(groupId) : null;

    if (routeSubEvent && routeDepAirport && routeArrAirport) {
      content = (
        <PopupContainer
          title={
            routeSignup
              ? `${routeGroup?.name || "Signup"} Flight`
              : `${routeSubEvent.name} (Group Flight)`
          }
        >
          <p>
            Route: {routeDepAirport.icao} → {routeArrAirport.icao}
          </p>
          {routeSignup?.callsign && <p>Callsign: {routeSignup.callsign}</p>}
          <p>
            Time: {context.formatTimeRange(routeSubEvent.scheduledStartTime, routeSubEvent.scheduledEndTime)}
          </p>
        </PopupContainer>
      );
    }
  }

  if (!content) return null;

  return (
    <Popup
      className="event-map-popup"
      maxWidth="320px"
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      onClose={() => setActivePopupInfo(null)}
      closeOnClick={false}
      offset={15}
    >
      {content}
    </Popup>
  );
};

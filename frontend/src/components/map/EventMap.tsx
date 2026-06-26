import React, { useState } from "react";
import { Group, FlightSignup, SubEvent } from "@/module_bindings/types";
import EventBaseMap from "./EventBaseMap";
import { FlightMarkers } from "./event-map/MapMarkers";
import { EventMapFlight } from "./event-map/types";
import { useTheme } from "../ThemeProvider";

interface EventMapProps {
  subEvents: SubEvent[];
  flightSignups: FlightSignup[];
  eventId?: string;
  creatorGroupId?: bigint;
  groupMap: Map<string, Group>;
  flights?: EventMapFlight[];
  className?: string;
  onMouseDown?: (e: any) => void;
  onMouseMove?: (e: any) => void;
  onMouseUp?: (e: any) => void;
  dragPan?: boolean;
  activeDrawingPoints?: [number, number][];
}

const EventMap: React.FC<EventMapProps> = ({
  subEvents,
  flightSignups,
  eventId,
  creatorGroupId,
  groupMap,
  flights = [],
  className,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  dragPan = true,
  activeDrawingPoints,
}) => {
  const { theme } = useTheme();

  const currentResolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const aircraftMarkerStroke =
    currentResolvedTheme === "dark" ? "#2D3748" : "#E2E8F0";

  const [activeFlightPopup, setActiveFlightPopup] =
    useState<EventMapFlight | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <EventBaseMap
        subEvents={subEvents}
        flightSignups={flightSignups}
        creatorGroupId={creatorGroupId}
        groupMap={groupMap}
        className={className}
        eventId={eventId}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        dragPan={dragPan}
        activeDrawingPoints={activeDrawingPoints}
      >
        <FlightMarkers
          flights={flights}
          defaultStroke={aircraftMarkerStroke}
          onFlightClick={(flight) => setActiveFlightPopup(flight)}
        />
      </EventBaseMap>

      {activeFlightPopup && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            padding: "12px",
            zIndex: 100,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", gap: "6px", alignItems: "center" }}>
            <span>{activeFlightPopup.callsign}</span>
            {activeFlightPopup.matchedLabel && (
              <span style={{
                fontSize: 10,
                background: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
                padding: "2px 6px",
                borderRadius: "9999px",
                fontWeight: 500
              }}>
                {activeFlightPopup.matchedLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            <div>Altitude: {Math.round(activeFlightPopup.altitude)} ft</div>
            <div>Speed: {Math.round(activeFlightPopup.ground_speed)} kts</div>
            <div>Heading: {Math.round(activeFlightPopup.heading)}°</div>
          </div>
          <button
            onClick={() => setActiveFlightPopup(null)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default EventMap;

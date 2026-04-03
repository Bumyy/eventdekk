import React from "react";
import { Marker } from "react-map-gl/maplibre";
import { AirportSVGIcon, AircraftSVGIcon, createMarkerIconStyle } from "./icons";
import { Airport, EventMapFlight } from "./types";

export const AirportMarkers: React.FC<{
  markers: Array<{
    key: string;
    airport: Airport;
    color: string;
    isHub: boolean;
    onClick: () => void;
  }>;
  resolvedTheme: "light" | "dark";
}> = ({ markers, resolvedTheme }) => {
  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.key}
          longitude={m.airport.longitude}
          latitude={m.airport.latitude}
          anchor="center"
        >
          <div style={createMarkerIconStyle(m.isHub)} onClick={m.onClick}>
            <AirportSVGIcon
              color={m.color}
              resolvedTheme={resolvedTheme}
              isHub={m.isHub}
            />
          </div>
        </Marker>
      ))}
    </>
  );
};

export const FlightMarkers: React.FC<{
  flights: EventMapFlight[];
  defaultStroke: string;
  onFlightClick: (flight: EventMapFlight) => void;
}> = ({ flights, defaultStroke, onFlightClick }) => {
  return (
    <>
      {flights.map((flight) => (
        <Marker
          key={`flight-${flight.flight_id}`}
          longitude={flight.longitude}
          latitude={flight.latitude}
          anchor="center"
        >
          <div
            onClick={() => onFlightClick(flight)}
            style={{ cursor: "pointer", transition: "transform 0.3s linear" }}
          >
            <AircraftSVGIcon
              heading={flight.heading}
              color={flight.matchedColor || "#4A5568"}
              stroke={defaultStroke}
            />
          </div>
        </Marker>
      ))}
    </>
  );
};

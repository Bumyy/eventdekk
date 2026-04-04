import React from "react";
import { Marker } from "react-map-gl/maplibre";
import {
  AirportSVGIcon,
  AircraftSVGIcon,
  createMarkerIconStyle,
} from "./icons";
import { Airport, EventMapFlight } from "./types";

export const AirportMarkers: React.FC<{
  markers: Array<{
    key: string;
    airport: Airport;
    color: string;
    isHub: boolean;
    onClick?: () => void;
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
          <div style={{ position: "relative" }}>
            <div
              style={{
                ...createMarkerIconStyle(m.isHub),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={m.onClick}
            >
              <AirportSVGIcon
                color={m.color}
                resolvedTheme={resolvedTheme}
                isHub={m.isHub}
              />
            </div>
          </div>
        </Marker>
      ))}
    </>
  );
};

export const SmallAirportMarkers: React.FC<{
  markers: Array<{
    key: string;
    longitude: number;
    latitude: number;
    color: string;
  }>;
}> = ({ markers }) => {
  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.key}
          longitude={m.longitude}
          latitude={m.latitude}
          anchor="center"
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: m.color,
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        </Marker>
      ))}
    </>
  );
};

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

function calculateLabelOffset(
  index: number,
  total: number,
  baseOffset: number
): [number, number] {
  const angle = (index / Math.max(total - 1, 1)) * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * baseOffset;
  const y = Math.sin(angle) * baseOffset;
  return [x, y];
}

export const AirportIcaoLabels: React.FC<{
  labels: Array<{
    key: string;
    icao: string;
    longitude: number;
    latitude: number;
    color: string;
    isHub?: boolean;
    offset?: [number, number];
    subText?: string;
  }>;
  compact?: boolean;
}> = ({ labels, compact = false }) => {
  const positionedLabels = labels.map((label, index) => {
    const offset =
      label.offset || calculateLabelOffset(index, labels.length, 12);
    return { ...label, offset };
  });

  return (
    <>
      {positionedLabels.map((label) => (
        <Marker
          key={label.key}
          longitude={label.longitude}
          latitude={label.latitude}
          anchor="left"
          offset={label.offset}
        >
          <div
            style={{
              backgroundColor: label.color,
              color: getContrastColor(label.color),
              paddingLeft: compact ? "2px" : "3px",
              paddingRight: compact ? "2px" : "3px",
              paddingTop: "1px",
              paddingBottom: "1px",
              borderRadius: "3px",
              fontSize: compact ? "11px" : label.isHub ? "14px" : "13px",
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          >
            {label.icao}
          </div>
          {label.subText && (
            <div
              style={{
                marginTop: "2px",
                fontSize: "9px",
                fontWeight: 600,
                lineHeight: 1,
                color: "hsl(var(--foreground))",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              {label.subText}
            </div>
          )}
        </Marker>
      ))}
    </>
  );
};

export const SubEventLabels: React.FC<{
  labels: Array<{
    key: string;
    text: string;
    subText?: string;
    longitude: number;
    latitude: number;
    color: string;
    offset?: [number, number];
  }>;
}> = ({ labels }) => {
  return (
    <>
      {labels.map((label) => (
        <Marker
          key={label.key}
          longitude={label.longitude}
          latitude={label.latitude}
          anchor="left"
          offset={label.offset || [10, 0]}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <div
              style={{
                backgroundColor: label.color,
                color: getContrastColor(label.color),
                paddingLeft: "6px",
                paddingRight: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              {label.text}
            </div>
            {label.subText && (
              <div
                style={{
                  backgroundColor: "hsl(var(--background) / 0.85)",
                  color: "hsl(var(--foreground))",
                  paddingLeft: "4px",
                  paddingRight: "4px",
                  paddingTop: "1px",
                  paddingBottom: "1px",
                  borderRadius: "3px",
                  fontSize: "9px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                {label.subText}
              </div>
            )}
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

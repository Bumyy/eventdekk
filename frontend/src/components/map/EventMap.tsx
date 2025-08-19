// src/components/map/EventMap.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  MapRef,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css"; // Import MapLibre CSS
import { format } from "date-fns";
import bbox from "@turf/bbox"; // For calculating bounding box
import { WebMercatorViewport } from "@deck.gl/core"; // For fitting bounds

import { SubEvent } from "@/module_bindings/sub_event_type";
import { FlightSignup } from "@/module_bindings/flight_signup_type";
import { Group } from "@/module_bindings/group_type";
import { SubEventType } from "@/module_bindings/sub_event_type_type";
import { Timestamp } from "@clockworklabs/spacetimedb-sdk";
import { useTheme } from "../ThemeProvider";
import { fetchAirportsByIcao } from "../../services/airportService";

// Interfaces (Airport, Flight, EventMapProps - unchanged)
interface Airport {
  id: number;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}
interface Flight {
  flight_id: string;
  callsign: string;
  aircraft_id?: string;
  livery_id?: string;
  latitude: number;
  longitude: number;
  altitude: number;
  ground_speed: number;
  heading: number;
  last_updated: string;
}
interface EventMapProps {
  subEvents: SubEvent[];
  flightSignups: FlightSignup[];
  eventId?: string;
  creatorGroupId?: bigint;
  groupMap: Map<string, Group>;
  flights?: Flight[];
  className?: string;
}

// Helper for custom SVG Marker Icons (similar to Leaflet days)
const createMarkerIconStyle = (
  color: string,
  resolvedTheme: "light" | "dark",
  isHub: boolean = false,
  sizeOverride?: number
): React.CSSProperties => {
  const baseSize = isHub ? 18 : 14;
  const size = sizeOverride || baseSize;
  // The SVG will be a child, this style is for the container div of the Marker
  return {
    width: `${size}px`,
    height: `${size}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    // transform: 'translate(-50%, -50%)' // Marker component handles anchoring
  };
};

const AirportSVGIcon: React.FC<{
  color: string;
  resolvedTheme: "light" | "dark";
  isHub?: boolean;
  size?: number;
}> = ({ color, resolvedTheme, isHub = false, size: customSize }) => {
  const baseSize = isHub ? 18 : 14;
  const size = customSize || baseSize;
  const strokeColor = resolvedTheme === "dark" ? "#FFFFFF" : "#000000";
  const strokeWidth = 1.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - strokeWidth) / 2}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {isHub && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 4}
          fill={strokeColor}
        />
      )}
    </svg>
  );
};

const AircraftSVGIcon: React.FC<{
  heading: number;
  color?: string;
  stroke?: string;
  size?: number;
}> = ({ heading, color = "white", stroke = "black", size = 22 }) => {
  return (
    <div
      style={{
        transform: `rotate(${heading}deg)`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
      >
        <path
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
          fill={color}
          stroke={stroke}
          strokeWidth={0.5}
        />
      </svg>
    </div>
  );
};

const MAPTILER_API_KEY =
  import.meta.env.VITE_MAPTILER_API_KEY || "YOUR_FALLBACK_MAPTILER_KEY"; // IMPORTANT: Add your Maptiler API key to .env

const EventMap: React.FC<EventMapProps> = ({
  subEvents,
  flightSignups,
  creatorGroupId,
  groupMap,
  flights = [],
  className,
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef | null>(null);

  const currentResolvedTheme = useMemo(
    (): "light" | "dark" =>
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme,
    [theme]
  );

  const [airportData, setAirportData] = useState<Map<string, Airport>>(
    new Map()
  );

  const [loadingAirports, setLoadingAirports] = useState(true);
  const [airportError, setAirportError] = useState<string | null>(null);

  const [activePopupInfo, setActivePopupInfo] = useState<{
    type: "airport" | "flight" | "route";
    data: any;
    longitude: number;
    latitude: number;
  } | null>(null);

  const [initialViewState] = useState({
    longitude: -98.5795, // Centered on US initially
    latitude: 39.8283,
    zoom: 3,
    pitch: 0,
    bearing: 0,
  });

  const icaos = useMemo(() => {
    /* ... (unchanged) ... */
    const codeSet = new Set<string>();
    const flyInOutSubEventIds = new Set<bigint>();
    subEvents.forEach((se) => {
      if (se.hubIcao) codeSet.add(se.hubIcao);
      if (
        se.subEventType.tag === SubEventType.FlyIn.tag ||
        se.subEventType.tag === SubEventType.FlyOut.tag
      ) {
        if (se.hubIcao) flyInOutSubEventIds.add(se.subEventId);
      }
      if (se.groupFlightDepartureIcao) codeSet.add(se.groupFlightDepartureIcao);
      if (se.groupFlightArrivalIcao) codeSet.add(se.groupFlightArrivalIcao);
    });
    flightSignups.forEach((signup) => {
      if (flyInOutSubEventIds.has(signup.subEventId)) {
        if (signup.departureIcao) codeSet.add(signup.departureIcao);
        if (signup.arrivalIcao) codeSet.add(signup.arrivalIcao);
      }
    });
    return Array.from(codeSet).filter(Boolean);
  }, [subEvents, flightSignups]);

  const fitMapToData = useCallback(
    (airportsToFit: Airport[], flightsToFit: Flight[]) => {
      if (
        !mapRef.current ||
        (airportsToFit.length === 0 && flightsToFit.length === 0)
      )
        return;

      const points: [number, number][] = [];
      airportsToFit.forEach((ap) => points.push([ap.longitude, ap.latitude]));
      flightsToFit.forEach((fl) => points.push([fl.longitude, fl.latitude]));

      if (points.length === 0) return;
      if (points.length === 1) {
        mapRef.current.flyTo({ center: points[0], zoom: 10 });
        return;
      }

      const featureCollection = {
        type: "FeatureCollection" as const,
        features: points.map((p) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: p },
          properties: {},
        })),
      };
      const [minLng, minLat, maxLng, maxLat] = bbox(featureCollection);

      const viewport = new WebMercatorViewport({
        width: mapRef.current.getMap().getCanvas().width,
        height: mapRef.current.getMap().getCanvas().height,
      });
      const { longitude, latitude, zoom } = viewport.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: 80, // Increased padding
        }
      );

      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: Math.min(zoom, 15), // Cap max zoom
        duration: 1000,
      });
    },
    []
  );

  useEffect(() => {
    if (icaos.length === 0) {
      setAirportData(new Map());
      setLoadingAirports(false);
      setAirportError(null);
      // Optionally reset view or keep current
      return;
    }
    setLoadingAirports(true);
    setAirportError(null);
    const fetchAndSetAirports = async () => {
      try {
        const fetchedMap = await fetchAirportsByIcao(icaos);
        const newAirportData = new Map(Object.entries(fetchedMap));
        setAirportData(newAirportData);
        // Fit map after airports are loaded if it's the initial load or significant change
        // This logic can be refined (e.g., only fit once)
        if (newAirportData.size > 0) {
          fitMapToData(Array.from(newAirportData.values()), flights);
        }
      } catch (err) {
        console.error("Error fetching airport data:", err);
        setAirportError("Failed to load airport locations.");
        setAirportData(new Map());
      } finally {
        setLoadingAirports(false);
      }
    };
    fetchAndSetAirports();
  }, [icaos, fitMapToData]); // Added flights to deps of fitMapToData if it's called from here

  // Update map bounds when flights data changes significantly
  useEffect(() => {
    if (flights.length > 0 && airportData.size > 0) {
      // Could add logic to only fit if bounds change drastically
      // fitMapToData(Array.from(airportData.values()), flights);
    }
  }, [flights, airportData, fitMapToData]);

  const getAirport = (icao: string | undefined): Airport | undefined =>
    airportData.get(icao || "");
  const formatTimeRange = (start: Timestamp, end: Timestamp): string => {
    /* ... (unchanged) ... */
    const startDate = start.toDate();
    const endDate = end.toDate();
    const startFormat = "MMM d, HH:mm";
    const endFormat =
      format(startDate, "yyyyMMdd") === format(endDate, "yyyyMMdd")
        ? "HH:mm 'UTC'"
        : "MMM d, HH:mm 'UTC'";
    return `${format(startDate, startFormat)} - ${format(endDate, endFormat)}`;
  };

  const defaultGroupFlightColor =
    currentResolvedTheme === "dark" ? "#4299E1" : "#3182CE";
  const defaultSignupFlightColor =
    currentResolvedTheme === "dark" ? "#ED8936" : "#DD6B20";
  const aircraftMarkerColor =
    currentResolvedTheme === "dark" ? "#CBD5E0" : "#4A5568"; // For plane icon
  const aircraftMarkerStroke =
    currentResolvedTheme === "dark" ? "#2D3748" : "#E2E8F0";

  // Airport Markers
  const airportMarkers = useMemo(() => {
    const markers: JSX.Element[] = [];
    const renderedIcaos = new Set<string>();
    subEvents.forEach((subEvent) => {
      const hostGroup = groupMap.get(creatorGroupId?.toString() || "");
      const baseColor = hostGroup?.color || defaultGroupFlightColor;

      const addMarker = (icao: string | undefined, isHub: boolean) => {
        if (!icao || renderedIcaos.has(icao)) return;
        const airport = getAirport(icao);
        if (airport) {
          markers.push(
            <Marker
              key={`airport-${airport.icao}`}
              longitude={airport.longitude}
              latitude={airport.latitude}
              anchor="center"
            >
              <div
                style={createMarkerIconStyle(
                  baseColor,
                  currentResolvedTheme,
                  isHub
                )}
                onClick={() =>
                  setActivePopupInfo({
                    type: "airport",
                    data: { airport, subEvent, isHub },
                    longitude: airport.longitude,
                    latitude: airport.latitude,
                  })
                }
              >
                <AirportSVGIcon
                  color={baseColor}
                  resolvedTheme={currentResolvedTheme}
                  isHub={isHub}
                />
              </div>
            </Marker>
          );
          renderedIcaos.add(icao);
        }
      };
      if (subEvent.subEventType.tag === SubEventType.GroupFlight.tag) {
        addMarker(subEvent.groupFlightDepartureIcao, false);
        addMarker(subEvent.groupFlightArrivalIcao, false);
      } else if (
        subEvent.subEventType.tag === SubEventType.FlyIn.tag ||
        subEvent.subEventType.tag === SubEventType.FlyOut.tag
      ) {
        addMarker(subEvent.hubIcao, true);
      }
    });
    return markers;
  }, [
    subEvents,
    airportData,
    groupMap,
    creatorGroupId,
    currentResolvedTheme,
    defaultGroupFlightColor,
  ]);

  // Flight Markers
  const flightMarkers = useMemo(() => {
    return flights.map((flight) => (
      <Marker
        key={`flight-${flight.flight_id}`}
        longitude={flight.longitude}
        latitude={flight.latitude}
        anchor="center"
      >
        <div
          onClick={() =>
            setActivePopupInfo({
              type: "flight",
              data: flight,
              longitude: flight.longitude,
              latitude: flight.latitude,
            })
          }
          style={{ cursor: "pointer", transition: "transform 0.3s linear" }}
        >
          {" "}
          {/* Transition for position changes if map re-renders marker */}
          <AircraftSVGIcon
            heading={flight.heading}
            color={aircraftMarkerColor}
            stroke={aircraftMarkerStroke}
          />
        </div>
      </Marker>
    ));
  }, [
    flights,
    currentResolvedTheme,
    aircraftMarkerColor,
    aircraftMarkerStroke,
  ]);

  // Flight Path Lines (GeoJSON for Source/Layer)
  const flightPathGeoJson =
    useMemo((): GeoJSON.FeatureCollection<GeoJSON.LineString> => {
      const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      subEvents.forEach((subEvent) => {
        const hostGroup = groupMap.get(creatorGroupId?.toString() || "");
        const hostGroupColor = hostGroup?.color || defaultGroupFlightColor;

        if (
          subEvent.subEventType.tag === SubEventType.GroupFlight.tag &&
          subEvent.groupFlightDepartureIcao &&
          subEvent.groupFlightArrivalIcao
        ) {
          const depAirport = getAirport(subEvent.groupFlightDepartureIcao);
          const arrAirport = getAirport(subEvent.groupFlightArrivalIcao);
          if (depAirport && arrAirport) {
            features.push({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [depAirport.longitude, depAirport.latitude],
                  [arrAirport.longitude, arrAirport.latitude],
                ],
              },
              properties: {
                id: `gf-${subEvent.subEventId}`,
                type: "group-flight",
                color: hostGroupColor,
                lineWidth: 3,
                subEvent,
                depAirport,
                arrAirport,
              },
            });
          }
        } else if (
          (subEvent.subEventType.tag === SubEventType.FlyIn.tag ||
            subEvent.subEventType.tag === SubEventType.FlyOut.tag) &&
          subEvent.hubIcao
        ) {
          const hubAirport = getAirport(subEvent.hubIcao);
          if (hubAirport) {
            flightSignups
              .filter((fs) => fs.subEventId === subEvent.subEventId)
              .forEach((signup) => {
                const depIcao =
                  subEvent.subEventType.tag === SubEventType.FlyIn.tag
                    ? signup.departureIcao
                    : subEvent.hubIcao;
                const arrIcao =
                  subEvent.subEventType.tag === SubEventType.FlyIn.tag
                    ? subEvent.hubIcao
                    : signup.arrivalIcao;
                const depAirport = getAirport(depIcao);
                const arrAirport = getAirport(arrIcao);
                const group = groupMap.get(signup.groupId.toString());
                if (depAirport && arrAirport) {
                  features.push({
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: [
                        [depAirport.longitude, depAirport.latitude],
                        [arrAirport.longitude, arrAirport.latitude],
                      ],
                    },
                    properties: {
                      id: `su-${signup.signupId}`,
                      type: "signup-flight",
                      color: group?.color || defaultSignupFlightColor,
                      lineWidth: 2.5,
                      lineDash: [4, 2],
                      subEvent,
                      signup,
                      depAirport,
                      arrAirport,
                    },
                  });
                }
              });
          }
        }
      });
      return { type: "FeatureCollection", features };
    }, [
      subEvents,
      flightSignups,
      airportData,
      groupMap,
      creatorGroupId,
      defaultGroupFlightColor,
      defaultSignupFlightColor,
    ]);

  const lineLayerStyle: LayerProps = {
    id: "flight-paths",
    type: "line",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["get", "lineWidth"],
      "line-dasharray": ["coalesce", ["get", "lineDash"], [1, 0]], // Default to solid if no dash
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  };

  const handleMapClick = useCallback((event: mapboxgl.MapLayerMouseEvent) => {
    if (event.features && event.features.length > 0) {
      const feature = event.features[0];
      if (feature.layer.id === "flight-paths" && feature.properties) {
        setActivePopupInfo({
          type: "route",
          data: feature.properties, // Contains subEvent, depAirport, arrAirport, etc.
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
        return;
      }
    }
    // If not clicking on a line feature, clear popup (unless a marker was clicked, handled by marker's onClick)
    // To prevent popup from closing if clicked on map while it's open from a marker:
    // if (!activePopupInfo) setActivePopupInfo(null);
    // For simplicity now, allow map click to close any popup
    // setActivePopupInfo(null); // This might be too aggressive if popup is for a marker
  }, []);

  const mapStyleUrl = useMemo(() => {
    const styleName =
      currentResolvedTheme === "dark" ? "dataviz-dark" : "dataviz-light"; // Using Maptiler Dataviz styles
    return `https://api.maptiler.com/maps/${styleName}/style.json?key=${MAPTILER_API_KEY}`;
  }, [currentResolvedTheme]);

  const renderPopup = () => {
    if (!activePopupInfo) return null;
    const { type, data, longitude, latitude } = activePopupInfo;

    const popupStyle: React.CSSProperties = {
      /* Shadcn-like style */ backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      border: `1px solid hsl(var(--border))`,
      borderRadius: "var(--radius, 0.5rem)",
      padding: "0.75rem 1rem",
      maxWidth: "300px",
      fontSize: "0.875rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      lineHeight: "1.4",
    };
    const PopupContainer: React.FC<{
      title: string;
      children: React.ReactNode;
    }> = ({ title, children }) => (
      <div style={popupStyle}>
        {" "}
        <h3 className="font-semibold text-base mb-2">{title}</h3> {children}{" "}
      </div>
    );

    let content = null;
    switch (type) {
      case "airport":
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
              Time:{" "}
              {formatTimeRange(
                subEvent.scheduledStartTime,
                subEvent.scheduledEndTime
              )}
            </p>
            {subEvent.notes && (
              <p className="text-xs mt-1 opacity-80">Notes: {subEvent.notes}</p>
            )}
          </PopupContainer>
        );
        break;
      case "flight":
        const flight = data as Flight;
        content = (
          <PopupContainer title={flight.callsign}>
            <p>Altitude: {Math.round(flight.altitude)} ft</p>
            <p>Speed: {Math.round(flight.ground_speed)} kts</p>
            <p>Heading: {Math.round(flight.heading)}°</p>
            <p className="text-xs mt-1 opacity-70">
              Updated: {new Date(flight.last_updated).toLocaleTimeString()}
            </p>
          </PopupContainer>
        );
        break;
      case "route":
        const {
          subEvent: routeSubEvent,
          depAirport,
          arrAirport,
          signup,
        } = data;
        const routeTitle = signup
          ? `${
              groupMap.get(signup.groupId.toString())?.name || "Signup"
            } Flight`
          : `${routeSubEvent.name} (Group Flight)`;
        content = (
          <PopupContainer title={routeTitle}>
            <p>
              Route: {depAirport.icao} → {arrAirport.icao}
            </p>
            {signup?.callsign && <p>Callsign: {signup.callsign}</p>}
            <p>
              Time:{" "}
              {formatTimeRange(
                routeSubEvent.scheduledStartTime,
                routeSubEvent.scheduledEndTime
              )}
            </p>
          </PopupContainer>
        );
        break;
    }
    if (!content) return null;
    return (
      <Popup
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

  if (!MAPTILER_API_KEY || MAPTILER_API_KEY === "YOUR_FALLBACK_MAPTILER_KEY") {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "red",
        }}
      >
        Missing MAPTILER_API_KEY in .env file.
      </div>
    );
  }
  if (loadingAirports && icaos.length > 0) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "hsl(var(--muted))",
        }}
      >
        Loading map data...
      </div>
    );
  }
  if (airportError) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "hsl(var(--destructive))",
          background: "hsl(var(--muted))",
        }}
      >
        Error: {airportError}
      </div>
    );
  }

  return (
    <div
      className={className || "w-full h-full"}
      style={{ position: "relative", background: "hsl(var(--background))" }}
    >
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapLib={import("maplibre-gl")}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyleUrl}
        onClick={handleMapClick}
        interactiveLayerIds={["flight-paths"]} // Make line layer clickable
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {airportMarkers}
        {flightMarkers}

        <Source
          id="flight-paths-source"
          type="geojson"
          data={flightPathGeoJson}
        >
          <Layer {...lineLayerStyle} />
        </Source>

        {renderPopup()}
      </Map>
    </div>
  );
};

export default EventMap;

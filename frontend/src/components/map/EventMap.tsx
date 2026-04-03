import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import MapGL, {
  Source,
  Layer,
  MapRef,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { format } from "date-fns";
import bbox from "@turf/bbox";
import { WebMercatorViewport } from "@deck.gl/core";

import {
  SubEventType,
  Group,
  FlightSignup,
  SubEvent,
} from "@/module_bindings/types";
import { Timestamp } from "spacetimedb";
import { useTheme } from "../ThemeProvider";
import { fetchAirportsByIcao } from "../../services/airportService";
import { AirportMarkers, FlightMarkers } from "./event-map/MapMarkers";
import { MapPopup } from "./event-map/MapPopup";
import { ActivePopupInfo, Airport, EventMapFlight } from "./event-map/types";
interface EventMapProps {
  subEvents: SubEvent[];
  flightSignups: FlightSignup[];
  eventId?: string;
  creatorGroupId?: bigint;
  groupMap: Map<string, Group>;
  flights?: EventMapFlight[];
  className?: string;
}

const MAPTILER_API_KEY =
  import.meta.env.VITE_MAPTILER_API_KEY || "YOUR_FALLBACK_MAPTILER_KEY";

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

  const [activePopupInfo, setActivePopupInfo] = useState<ActivePopupInfo>(null);

  const [initialViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3,
    pitch: 0,
    bearing: 0,
  });

  const icaos = useMemo(() => {
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
    (airportsToFit: Airport[], flightsToFit: EventMapFlight[]) => {
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
          padding: 80,
        }
      );

      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: Math.min(zoom, 15),
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
  }, [icaos, fitMapToData]);

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
  const aircraftMarkerStroke =
    currentResolvedTheme === "dark" ? "#2D3748" : "#E2E8F0";

  const airportMarkers = useMemo(() => {
    const markers: Array<{
      key: string;
      airport: Airport;
      color: string;
      isHub: boolean;
      onClick: () => void;
    }> = [];
    const renderedIcaos = new Set<string>();
    subEvents.forEach((subEvent) => {
      const hostGroup = groupMap.get(creatorGroupId?.toString() || "");
      const baseColor = hostGroup?.color || defaultGroupFlightColor;

      const addMarker = (icao: string | undefined, isHub: boolean) => {
        if (!icao || renderedIcaos.has(icao)) return;
        const airport = getAirport(icao);
        if (airport) {
          markers.push({
            key: `airport-${airport.icao}`,
            airport,
            color: baseColor,
            isHub,
            onClick: () =>
              setActivePopupInfo({
                type: "airport",
                data: { airport, subEvent, isHub },
                longitude: airport.longitude,
                latitude: airport.latitude,
              }),
          });
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
    defaultGroupFlightColor,
  ]);

  // Flight Path Lines (GeoJSON for Source/Layer) - Split into solid and dashed
  const { groupFlightPaths, signupFlightPaths } = useMemo(() => {
    const groupFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const signupFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

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
          groupFeatures.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [depAirport.longitude, depAirport.latitude],
                [arrAirport.longitude, arrAirport.latitude],
              ],
            },
            properties: {
              id: `gf-${subEvent.subEventId.toString()}`,
              color: hostGroupColor,
              lineWidth: 3,
              subEventId: subEvent.subEventId.toString(),
              depIcao: subEvent.groupFlightDepartureIcao,
              arrIcao: subEvent.groupFlightArrivalIcao,
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
                signupFeatures.push({
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [depAirport.longitude, depAirport.latitude],
                      [arrAirport.longitude, arrAirport.latitude],
                    ],
                  },
                  properties: {
                    id: `su-${signup.signupId.toString()}`,
                    color: group?.color || defaultSignupFlightColor,
                    lineWidth: 2.5,
                    subEventId: subEvent.subEventId.toString(),
                    signupId: signup.signupId.toString(),
                    depIcao,
                    arrIcao,
                    groupId: signup.groupId.toString(),
                  },
                });
              }
            });
        }
      }
    });

    return {
      groupFlightPaths: {
        type: "FeatureCollection" as const,
        features: groupFeatures,
      },
      signupFlightPaths: {
        type: "FeatureCollection" as const,
        features: signupFeatures,
      },
    };
  }, [
    subEvents,
    flightSignups,
    airportData,
    groupMap,
    creatorGroupId,
    defaultGroupFlightColor,
    defaultSignupFlightColor,
  ]);

  const groupFlightLayerStyle: LayerProps = {
    id: "group-flight-paths",
    type: "line",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["get", "lineWidth"],
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  };

  const signupFlightLayerStyle: LayerProps = {
    id: "signup-flight-paths",
    type: "line",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["get", "lineWidth"],
      "line-dasharray": [4, 2],
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  };

  const handleMapClick = useCallback((event: mapboxgl.MapLayerMouseEvent) => {
    if (event.features && event.features.length > 0) {
      const feature = event.features[0];
      const layerId = feature.layer?.id;
      if (
        (layerId === "group-flight-paths" ||
          layerId === "signup-flight-paths") &&
        feature.properties
      ) {
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

  if (!MAPTILER_API_KEY || MAPTILER_API_KEY === "FALLBACK_MAPTILER_KEY") {
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
      <MapGL
        ref={mapRef}
        initialViewState={initialViewState}
        mapLib={import("maplibre-gl")}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyleUrl}
        onClick={handleMapClick}
        interactiveLayerIds={["group-flight-paths", "signup-flight-paths"]}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        <AirportMarkers
          markers={airportMarkers}
          resolvedTheme={currentResolvedTheme}
        />
        <FlightMarkers
          flights={flights}
          defaultStroke={aircraftMarkerStroke}
          onFlightClick={(flight) =>
            setActivePopupInfo({
              type: "flight",
              data: flight,
              longitude: flight.longitude,
              latitude: flight.latitude,
            })
          }
        />

        <Source
          id="group-flight-paths-source"
          type="geojson"
          data={groupFlightPaths}
        >
          <Layer {...groupFlightLayerStyle} />
        </Source>

        <Source
          id="signup-flight-paths-source"
          type="geojson"
          data={signupFlightPaths}
        >
          <Layer {...signupFlightLayerStyle} />
        </Source>

        <MapPopup
          activePopupInfo={activePopupInfo}
          setActivePopupInfo={setActivePopupInfo}
          context={{
            subEvents,
            flightSignups,
            groupMap,
            getAirport,
            formatTimeRange,
          }}
        />
      </MapGL>
    </div>
  );
};

export default EventMap;

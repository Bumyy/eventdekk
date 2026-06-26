import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
} from "react";
import MapGL, { Source, Layer, MapRef } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
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
import { useEventOverlays } from "../../hooks/spacetimeHooks";
import {
  AirportMarkers,
  AirportIcaoLabels,
  SmallAirportMarkers,
} from "./event-map/MapMarkers";
import { MapPopup } from "./event-map/MapPopup";
import { ActivePopupInfo, Airport } from "./event-map/types";

export interface EventBaseMapProps {
  subEvents: SubEvent[];
  flightSignups: FlightSignup[];
  creatorGroupId?: bigint;
  groupMap: Map<string, Group>;
  className?: string;
  showSignupRoutes?: boolean;
  children?: React.ReactNode;
  eventId?: string;
  onMouseDown?: (e: any) => void;
  onMouseMove?: (e: any) => void;
  onMouseUp?: (e: any) => void;
  dragPan?: boolean;
  activeDrawingPoints?: [number, number][];
}

const MAPTILER_API_KEY =
  import.meta.env.VITE_MAPTILER_API_KEY || "YOUR_FALLBACK_MAPTILER_KEY";

const EventBaseMap: React.FC<EventBaseMapProps> = ({
  subEvents,
  flightSignups,
  creatorGroupId,
  groupMap,
  className,
  showSignupRoutes = true,
  children,
  eventId,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  dragPan = true,
  activeDrawingPoints,
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef | null>(null);

  const eventIdBigInt = useMemo(() => {
    if (!eventId) return null;
    try {
      return BigInt(eventId);
    } catch {
      return null;
    }
  }, [eventId]);

  const overlays = useEventOverlays(eventIdBigInt);

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
  const [mapReady, setMapReady] = useState(false);

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
    if (showSignupRoutes) {
      flightSignups.forEach((signup) => {
        if (flyInOutSubEventIds.has(signup.subEventId)) {
          if (signup.departureIcao) codeSet.add(signup.departureIcao);
          if (signup.arrivalIcao) codeSet.add(signup.arrivalIcao);
        }
      });
    }
    return Array.from(codeSet).filter(Boolean).sort();
  }, [subEvents, flightSignups, showSignupRoutes]);

  const prevIcaosRef = useRef<string[]>([]);

  const fitMapToData = useCallback((airportsToFit: Airport[]) => {
    if (!mapRef.current || airportsToFit.length === 0) return;

    const points: [number, number][] = [];
    airportsToFit.forEach((ap) => points.push([ap.longitude, ap.latitude]));

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
      { padding: 80 }
    );

    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: Math.min(zoom, 15),
      duration: 1000,
    });
  }, []);

  useEffect(() => {
    const sortedPrev = prevIcaosRef.current;
    const changed =
      icaos.length !== sortedPrev.length ||
      icaos.some((icao, i) => icao !== sortedPrev[i]);

    if (!changed) return;
    prevIcaosRef.current = icaos;

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
      } catch (err) {
        console.error("Error fetching airport data:", err);
        setAirportError("Failed to load airport locations.");
        setAirportData(new Map());
      } finally {
        setLoadingAirports(false);
      }
    };
    fetchAndSetAirports();
  }, [icaos]);

  useEffect(() => {
    if (mapReady && airportData.size > 0) {
      fitMapToData(Array.from(airportData.values()));
    }
  }, [mapReady, airportData, fitMapToData]);

  const getAirport = (icao: string | undefined): Airport | undefined =>
    airportData.get(icao || "");

  const formatTimeRange = (start: Timestamp, end: Timestamp): string => {
    const startDate = start.toDate();
    const endDate = end.toDate();
    const startFormat = "MMM d, HH:mm";
    const endFormat =
      startDate.toDateString() === endDate.toDateString()
        ? "HH:mm 'UTC'"
        : "MMM d, HH:mm 'UTC'";
    return `${startDate.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endDate.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const defaultGroupFlightColor =
    currentResolvedTheme === "dark" ? "#4299E1" : "#3182CE";
  const defaultSignupFlightColor =
    currentResolvedTheme === "dark" ? "#ED8936" : "#DD6B20";

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

  const { airportIcaoLabels, signupIcaoLabels, signupMarkers } = useMemo(() => {
    const airportLabels: Array<{
      key: string;
      icao: string;
      longitude: number;
      latitude: number;
      color: string;
      isHub: boolean;
      offset?: [number, number];
    }> = [];
    const signupLabels: Array<{
      key: string;
      icao: string;
      longitude: number;
      latitude: number;
      color: string;
      offset?: [number, number];
    }> = [];
    const signupMarkerList: Array<{
      key: string;
      longitude: number;
      latitude: number;
      color: string;
    }> = [];

    const eventAirportIcaos = new Set<string>();
    const hostGroup = groupMap.get(creatorGroupId?.toString() || "");
    const hostColor = hostGroup?.color || defaultGroupFlightColor;

    subEvents.forEach((subEvent) => {
      if (subEvent.subEventType.tag === SubEventType.GroupFlight.tag) {
        if (subEvent.groupFlightDepartureIcao)
          eventAirportIcaos.add(subEvent.groupFlightDepartureIcao);
        if (subEvent.groupFlightArrivalIcao)
          eventAirportIcaos.add(subEvent.groupFlightArrivalIcao);
      } else if (subEvent.hubIcao) {
        eventAirportIcaos.add(subEvent.hubIcao);
      }
    });

    const labelSlotByAirport = new Map<string, number>();
    const renderedEventAirportLabels = new Set<string>();

    const nextAirportOffset = (
      icao: string,
      baseX: number,
      stepY: number
    ): [number, number] => {
      const slot = labelSlotByAirport.get(icao) || 0;
      labelSlotByAirport.set(icao, slot + 1);

      if (slot === 0) return [baseX, 0];
      const rank = Math.ceil(slot / 2);
      const direction = slot % 2 === 1 ? 1 : -1;
      return [baseX, direction * rank * stepY];
    };

    const addEventAirportLabel = (icao: string | undefined, isHub: boolean) => {
      if (!icao || renderedEventAirportLabels.has(icao)) return;
      const airport = getAirport(icao);
      if (!airport) return;

      airportLabels.push({
        key: `icao-${airport.icao}`,
        icao: airport.icao,
        longitude: airport.longitude,
        latitude: airport.latitude,
        color: hostColor,
        isHub,
        offset: nextAirportOffset(airport.icao, isHub ? 14 : 12, 14),
      });
      renderedEventAirportLabels.add(icao);
    };

    subEvents.forEach((subEvent) => {
      if (subEvent.subEventType.tag === SubEventType.GroupFlight.tag) {
        addEventAirportLabel(subEvent.groupFlightDepartureIcao, false);
        addEventAirportLabel(subEvent.groupFlightArrivalIcao, false);
      } else if (subEvent.hubIcao) {
        const hubAirport = getAirport(subEvent.hubIcao);
        if (hubAirport) {
          addEventAirportLabel(subEvent.hubIcao, true);
          const airportLabel = airportLabels.find(
            (label) => label.icao === hubAirport.icao
          );
          if (airportLabel) {
            airportLabel.subText =
              subEvent.subEventType.tag === SubEventType.FlyIn.tag
                ? "Fly-in"
                : "Fly-out";
          }
        }
      }
    });

    if (showSignupRoutes) {
      const renderedSignupIcaos = new Set<string>();
      flightSignups.forEach((signup) => {
        const group = groupMap.get(signup.groupId.toString());
        const color = group?.color || defaultSignupFlightColor;
        const subEvent = subEvents.find(
          (se) => se.subEventId === signup.subEventId
        );
        if (!subEvent) return;

        if (
          subEvent.subEventType.tag === SubEventType.FlyIn.tag &&
          signup.departureIcao
        ) {
          if (
            !eventAirportIcaos.has(signup.departureIcao) &&
            !renderedSignupIcaos.has(signup.departureIcao)
          ) {
            const airport = getAirport(signup.departureIcao);
            if (airport) {
              signupLabels.push({
                key: `signup-icao-${airport.icao}`,
                icao: airport.icao,
                longitude: airport.longitude,
                latitude: airport.latitude,
                color,
                offset: nextAirportOffset(airport.icao, 10, 12),
              });
              signupMarkerList.push({
                key: `signup-marker-${airport.icao}`,
                longitude: airport.longitude,
                latitude: airport.latitude,
                color,
              });
              renderedSignupIcaos.add(signup.departureIcao);
            }
          }
        }

        if (
          subEvent.subEventType.tag === SubEventType.FlyOut.tag &&
          signup.arrivalIcao
        ) {
          if (
            !eventAirportIcaos.has(signup.arrivalIcao) &&
            !renderedSignupIcaos.has(signup.arrivalIcao)
          ) {
            const airport = getAirport(signup.arrivalIcao);
            if (airport) {
              signupLabels.push({
                key: `signup-icao-${airport.icao}`,
                icao: airport.icao,
                longitude: airport.longitude,
                latitude: airport.latitude,
                color,
                offset: nextAirportOffset(airport.icao, 10, 12),
              });
              signupMarkerList.push({
                key: `signup-marker-${airport.icao}`,
                longitude: airport.longitude,
                latitude: airport.latitude,
                color,
              });
              renderedSignupIcaos.add(signup.arrivalIcao);
            }
          }
        }
      });
    }

    return {
      airportIcaoLabels: airportLabels,
      signupIcaoLabels: signupLabels,
      signupMarkers: signupMarkerList,
    };
  }, [
    subEvents,
    flightSignups,
    airportData,
    groupMap,
    creatorGroupId,
    defaultGroupFlightColor,
    defaultSignupFlightColor,
    showSignupRoutes,
  ]);

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
        subEvent.hubIcao &&
        showSignupRoutes
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
    showSignupRoutes,
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

  const handleMapLoad = useCallback(() => {
    setMapReady(true);
  }, []);

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
          data: feature.properties,
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
        return;
      }
    }
  }, []);

  const mapStyleUrl = useMemo(() => {
    const styleName =
      currentResolvedTheme === "dark" ? "dataviz-dark" : "dataviz-light";
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
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        dragPan={dragPan}
        interactiveLayerIds={["group-flight-paths", "signup-flight-paths"]}
        attributionControl={false}
      >
        {showSignupRoutes && <SmallAirportMarkers markers={signupMarkers} />}

        <AirportMarkers
          markers={airportMarkers}
          resolvedTheme={currentResolvedTheme}
        />

        {showSignupRoutes && (
          <AirportIcaoLabels labels={signupIcaoLabels} compact />
        )}

        <AirportIcaoLabels labels={airportIcaoLabels} />

        {overlays.map((overlay: any) => {
          if (overlay.overlayType === "image") {
            let bounds: [[number, number], [number, number], [number, number], [number, number]] | null = null;
            let opacity = 0.5;
            try {
              const configObj = JSON.parse(overlay.config);
              bounds = configObj.bounds;
              opacity = configObj.opacity !== undefined ? configObj.opacity : 0.5;
            } catch (e) {
              // ignore
            }
            return bounds ? (
              <Source
                key={overlay.overlayId.toString()}
                id={`overlay-img-src-${overlay.overlayId}`}
                type="image"
                url={overlay.data}
                coordinates={bounds}
              >
                <Layer
                  id={`overlay-img-layer-${overlay.overlayId}`}
                  type="raster"
                  paint={{ "raster-opacity": opacity }}
                />
              </Source>
            ) : null;
          } else {
            let geojson = null;
            let opacity = 0.5;
            let strokeColor = "#3B82F6";
            let strokeWidth = 3;
            let fillColor = "#3B82F6";
            try {
              geojson = JSON.parse(overlay.data);
              const configObj = JSON.parse(overlay.config || "{}");
              opacity = configObj.opacity !== undefined ? configObj.opacity : 0.5;
              strokeColor = configObj.strokeColor || "#3B82F6";
              strokeWidth = configObj.strokeWidth || 3;
              fillColor = configObj.fillColor || "#3B82F6";
            } catch (e) {
              // ignore
            }
            return geojson ? (
              <React.Fragment key={overlay.overlayId.toString()}>
                <Source
                  id={`overlay-geo-src-${overlay.overlayId}`}
                  type="geojson"
                  data={geojson}
                >
                  <Layer
                    id={`overlay-geo-layer-fill-${overlay.overlayId}`}
                    type="fill"
                    filter={["==", "$type", "Polygon"]}
                    paint={{
                      "fill-color": fillColor,
                      "fill-opacity": opacity * 0.4,
                    }}
                  />
                  <Layer
                    id={`overlay-geo-layer-line-${overlay.overlayId}`}
                    type="line"
                    filter={["in", "$type", "LineString", "Polygon"]}
                    paint={{
                      "line-color": strokeColor,
                      "line-width": strokeWidth,
                      "line-opacity": opacity,
                    }}
                    layout={{
                      "line-join": "round",
                      "line-cap": "round",
                    }}
                  />
                  <Layer
                    id={`overlay-geo-layer-circle-${overlay.overlayId}`}
                    type="circle"
                    filter={["==", "$type", "Point"]}
                    paint={{
                      "circle-radius": 6,
                      "circle-color": strokeColor,
                      "circle-opacity": opacity,
                      "circle-stroke-width": 1.5,
                      "circle-stroke-color": "#FFFFFF",
                    }}
                  />
                  <Layer
                    id={`overlay-geo-layer-label-${overlay.overlayId}`}
                    type="symbol"
                    filter={["has", "label"]}
                    layout={{
                      "text-field": ["get", "label"],
                      "text-size": 12,
                      "text-offset": [0, 1.5],
                      "text-anchor": "top",
                    }}
                    paint={{
                      "text-color": "#FFFFFF",
                      "text-halo-color": "#000000",
                      "text-halo-width": 1.5,
                    }}
                  />
                </Source>
              </React.Fragment>
            ) : null;
          }
        })}

        {activeDrawingPoints && activeDrawingPoints.length > 1 && (
          <Source
            id="drawing-in-progress-src"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: activeDrawingPoints,
              },
              properties: {},
            }}
          >
            <Layer
              id="drawing-in-progress-layer"
              type="line"
              paint={{
                "line-color": "#FF0000",
                "line-width": 3,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {children}

        <Source
          id="group-flight-paths-source"
          type="geojson"
          data={groupFlightPaths}
        >
          <Layer {...groupFlightLayerStyle} />
        </Source>

        {showSignupRoutes && (
          <Source
            id="signup-flight-paths-source"
            type="geojson"
            data={signupFlightPaths}
          >
            <Layer {...signupFlightLayerStyle} />
          </Source>
        )}

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

const arraysEqual = <T,>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const groupMapsEqual = (
  a: Map<string, Group>,
  b: Map<string, Group>
): boolean => {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return false;
  }
  return true;
};

const EventBaseMapMemo = memo(EventBaseMap, (prevProps, nextProps) => {
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.showSignupRoutes !== nextProps.showSignupRoutes) return false;
  if (prevProps.creatorGroupId !== nextProps.creatorGroupId) return false;
  if (prevProps.children !== nextProps.children) return false;

  if (!arraysEqual(prevProps.subEvents, nextProps.subEvents)) return false;
  if (!arraysEqual(prevProps.flightSignups, nextProps.flightSignups))
    return false;
  if (!groupMapsEqual(prevProps.groupMap, nextProps.groupMap)) return false;

  return true;
});

export default EventBaseMapMemo;

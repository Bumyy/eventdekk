import { useEffect, useMemo, useState } from "react";
import {
  useEvents,
  useEventParticipants,
  useFlightSignupsForEvent,
  useGroups,
  useSubEventsForEvent,
  useAllGroupCallsignFilters,
} from "@/hooks/spacetimeHooks";
import { fetchAirportStatusBatch } from "@/services/flightStatusService";
import { SubEventType } from "@/module_bindings/types";

export interface ApiFlight {
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

const toWords = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

const callsignMatchesFilter = (callsign: string, words: string) => {
  const normalizedCallsign = callsign.toLowerCase();
  const filterWords = toWords(words);
  if (filterWords.length === 0) return false;
  return filterWords.every((word) => normalizedCallsign.includes(word));
};

export const useEventFlightFiltering = (
  eventId: string | undefined,
  flights: ApiFlight[]
) => {
  const eventIdBigInt = useMemo(() => {
    if (!eventId) return null;
    try {
      return BigInt(eventId);
    } catch {
      return null;
    }
  }, [eventId]);

  const events = useEvents();
  const eventParticipants = useEventParticipants();
  const groups = useGroups();
  const eventSubEvents = useSubEventsForEvent(eventIdBigInt);
  const eventFlightSignups = useFlightSignupsForEvent(eventIdBigInt);
  const callsignFilters = useAllGroupCallsignFilters();
  const [candidateFlightIds, setCandidateFlightIds] = useState<Set<string>>(
    new Set()
  );
  const [airportStatuses, setAirportStatuses] = useState<
    Record<
      string,
      {
        inboundFlights: string[];
        outboundFlights: string[];
      }
    >
  >({});

  const event = useMemo(
    () => events.find((e) => e.eventId.toString() === eventId),
    [events, eventId]
  );

  const relevantIcaos = useMemo(() => {
    const set = new Set<string>();

    eventSubEvents.forEach((se) => {
      if (se.hubIcao) set.add(se.hubIcao.toUpperCase());
      if (se.groupFlightDepartureIcao) {
        set.add(se.groupFlightDepartureIcao.toUpperCase());
      }
      if (se.groupFlightArrivalIcao)
        set.add(se.groupFlightArrivalIcao.toUpperCase());
    });

    eventFlightSignups.forEach((signup) => {
      if (signup.departureIcao) set.add(signup.departureIcao.toUpperCase());
      if (signup.arrivalIcao) set.add(signup.arrivalIcao.toUpperCase());
    });

    return [...set];
  }, [eventSubEvents, eventFlightSignups]);

  useEffect(() => {
    if (!eventId || relevantIcaos.length === 0) {
      setCandidateFlightIds(new Set());
      setAirportStatuses({});
      return;
    }

    let isCancelled = false;

    const refreshAirportStatuses = async () => {
      try {
        const data = await fetchAirportStatusBatch(relevantIcaos);
        if (isCancelled) return;
        const nextStatuses: Record<
          string,
          {
            inboundFlights: string[];
            outboundFlights: string[];
          }
        > = {};

        Object.entries(data.statuses).forEach(([icao, status]) => {
          nextStatuses[icao.toUpperCase()] = {
            inboundFlights: (status.inboundFlights || []).map((id) =>
              String(id).toLowerCase()
            ),
            outboundFlights: (status.outboundFlights || []).map((id) =>
              String(id).toLowerCase()
            ),
          };
        });

        setAirportStatuses(nextStatuses);
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to fetch airport statuses:", error);
        setCandidateFlightIds(new Set());
        setAirportStatuses({});
      }
    };

    refreshAirportStatuses();
    const interval = window.setInterval(refreshAirportStatuses, 15000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [eventId, relevantIcaos]);

  useEffect(() => {
    const getInbound = (icao?: string | null): Set<string> => {
      if (!icao) return new Set();
      return new Set(airportStatuses[icao.toUpperCase()]?.inboundFlights || []);
    };

    const getOutbound = (icao?: string | null): Set<string> => {
      if (!icao) return new Set();
      return new Set(
        airportStatuses[icao.toUpperCase()]?.outboundFlights || []
      );
    };

    const intersection = (a: Set<string>, b: Set<string>): Set<string> => {
      if (a.size === 0 || b.size === 0) return new Set();
      const smaller = a.size <= b.size ? a : b;
      const larger = a.size <= b.size ? b : a;
      const result = new Set<string>();
      smaller.forEach((id) => {
        if (larger.has(id)) result.add(id);
      });
      return result;
    };

    const nextIds = new Set<string>();

    const routePairs = new Set<string>();
    const addRoutePair = (depIcao?: string | null, arrIcao?: string | null) => {
      if (!depIcao || !arrIcao) return;
      routePairs.add(`${depIcao.toUpperCase()}->${arrIcao.toUpperCase()}`);
    };

    eventSubEvents.forEach((subEvent) => {
      const signupsForSubEvent = eventFlightSignups.filter(
        (signup) => signup.subEventId === subEvent.subEventId
      );

      if (
        subEvent.subEventType.tag === SubEventType.GroupFlight.tag &&
        subEvent.groupFlightDepartureIcao &&
        subEvent.groupFlightArrivalIcao
      ) {
        addRoutePair(
          subEvent.groupFlightDepartureIcao,
          subEvent.groupFlightArrivalIcao
        );
        return;
      }

      if (
        subEvent.subEventType.tag === SubEventType.FlyIn.tag &&
        subEvent.hubIcao
      ) {
        if (signupsForSubEvent.length === 0) {
          getInbound(subEvent.hubIcao).forEach((id) => nextIds.add(id));
          return;
        }
        signupsForSubEvent.forEach((signup) => {
          addRoutePair(signup.departureIcao, subEvent.hubIcao);
        });
        return;
      }

      if (
        subEvent.subEventType.tag === SubEventType.FlyOut.tag &&
        subEvent.hubIcao
      ) {
        if (signupsForSubEvent.length === 0) {
          getOutbound(subEvent.hubIcao).forEach((id) => nextIds.add(id));
          return;
        }

        signupsForSubEvent.forEach((signup) => {
          addRoutePair(subEvent.hubIcao, signup.arrivalIcao);
        });
      }
    });

    routePairs.forEach((routeKey) => {
      const [depIcao, arrIcao] = routeKey.split("->");
      const outbound = getOutbound(depIcao);
      const inbound = getInbound(arrIcao);
      outbound.forEach((id) => nextIds.add(id));
      inbound.forEach((id) => nextIds.add(id));
    });

    setCandidateFlightIds(nextIds);
    console.log("[flightFilter] candidateIds built:", {
      subEvents: eventSubEvents.length,
      signups: eventFlightSignups.length,
      relevantIcaos,
      candidateFlightIds: nextIds.size,
      sampleIds: [...nextIds].slice(0, 3),
    });
  }, [eventSubEvents, eventFlightSignups, airportStatuses]);

  const attendingGroupIds = useMemo(() => {
    if (!event) return new Set<string>();

    const ids = new Set<string>([event.creatorGroupId.toString()]);
    eventParticipants
      .filter(
        (ep) =>
          ep.eventId.toString() === event.eventId.toString() &&
          ep.status.tag === "Accepted"
      )
      .forEach((ep) => ids.add(ep.groupId.toString()));

    eventFlightSignups.forEach((signup) => ids.add(signup.groupId.toString()));
    return ids;
  }, [event, eventParticipants, eventFlightSignups]);

  const attendingGroups = useMemo(
    () => groups.filter((g) => attendingGroupIds.has(g.groupId.toString())),
    [groups, attendingGroupIds]
  );

  const callsignFiltersByGroup = useMemo(() => {
    const map = new Map<string, typeof callsignFilters>();
    for (const filter of callsignFilters) {
      const groupId = filter.groupId.toString();
      if (!attendingGroupIds.has(groupId)) continue;
      const current = map.get(groupId) || [];
      current.push(filter);
      map.set(groupId, current);
    }
    return map;
  }, [callsignFilters, attendingGroupIds]);

  const groupMap = useMemo(() => {
    const map = new Map<string, (typeof groups)[number]>();
    groups.forEach((group) => {
      map.set(group.groupId.toString(), group);
    });
    return map;
  }, [groups]);

  const filteredFlights = useMemo(() => {
    const results: Array<
      ApiFlight & {
        matchedGroupId?: bigint;
        matchedColor: string;
        matchedLabel?: string;
      }
    > = [];

    if (!event) return results;

    const mode = event.flightFilterMode || "Airports";
    const showAll = event.showAllFlights ?? true;

    console.log("[flightFilter] mode:", mode, "showAll:", showAll, "total flights:", flights.length, "candidateIds:", candidateFlightIds.size);

    let geoFilteredFlights = flights;
    if (mode === "Airports" && relevantIcaos.length > 0) {
      geoFilteredFlights = flights.filter((flight) =>
        candidateFlightIds.has(String(flight.flight_id).toLowerCase())
      );
    } else if (mode === "Region" && event?.flightFilterBounds) {

    console.log("[flightFilter] after geoFilter:", geoFilteredFlights.length, "sample:", geoFilteredFlights.slice(0, 2).map(f => f.flight_id));

    console.log("[flightFilter] after geoFilter:", geoFilteredFlights.length, "sample:", geoFilteredFlights.slice(0, 2).map(f => f.flight_id));
      try {
        const [minLng, minLat, maxLng, maxLat] = JSON.parse(event.flightFilterBounds);
        geoFilteredFlights = flights.filter(
          (f) =>
            f.longitude >= minLng &&
            f.longitude <= maxLng &&
            f.latitude >= minLat &&
            f.latitude <= maxLat
        );
      } catch (e) {
        console.error("Error parsing flightFilterBounds:", e);
        geoFilteredFlights = [];
      }
    }

    const defaultUnmatchedColor = "#7A828D";

    for (const flight of geoFilteredFlights) {
      let matchedGroupId: bigint | null = null;
      let matchedColor = defaultUnmatchedColor;
      let matchedLabel: string | undefined = undefined;
      let isMatched = false;

      for (const [groupId, filters] of callsignFiltersByGroup.entries()) {
        const match = filters.find((f) =>
          callsignMatchesFilter(flight.callsign, f.words)
        );
        if (match) {
          const group = groupMap.get(groupId);
          matchedGroupId = group?.groupId || null;
          matchedColor = match.color || group?.color || defaultUnmatchedColor;
          matchedLabel = match.label || undefined;
          isMatched = true;
          break;
        }
      }

      if (isMatched || showAll) {
        results.push({
          ...flight,
          matchedGroupId: matchedGroupId || undefined,
          matchedColor,
          matchedLabel,
        });
      }
    }

    console.log("[flightFilter] result:", results.length, "flights");

    return results;
  }, [
    flights,
    callsignFiltersByGroup,
    groupMap,
    candidateFlightIds,
    relevantIcaos,
    event,
  ]);

  return {
    event,
    eventSubEvents,
    eventFlightSignups,
    attendingGroups,
    groupMap,
    filteredFlights,
  };
};

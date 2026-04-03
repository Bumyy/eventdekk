import { useEffect, useMemo, useState } from "react";
import {
  useEvents,
  useEventParticipants,
  useFlightSignups,
  useGroups,
  useSubEvents,
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
  const events = useEvents();
  const eventParticipants = useEventParticipants();
  const groups = useGroups();
  const subEvents = useSubEvents();
  const flightSignups = useFlightSignups();
  const callsignFilters = useAllGroupCallsignFilters();
  const [candidateFlightIds, setCandidateFlightIds] = useState<Set<string>>(new Set());
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

  const eventSubEvents = useMemo(() => {
    if (!eventId) return [];
    return subEvents.filter((se) => se.eventId.toString() === eventId);
  }, [subEvents, eventId]);

  const eventSubEventIdSet = useMemo(
    () => new Set(eventSubEvents.map((se) => se.subEventId.toString())),
    [eventSubEvents]
  );

  const eventFlightSignups = useMemo(
    () =>
      flightSignups.filter((signup) =>
        eventSubEventIdSet.has(signup.subEventId.toString())
      ),
    [flightSignups, eventSubEventIdSet]
  );

  const relevantIcaos = useMemo(() => {
    const set = new Set<string>();

    eventSubEvents.forEach((se) => {
      if (se.hubIcao) set.add(se.hubIcao.toUpperCase());
      if (se.groupFlightDepartureIcao) {
        set.add(se.groupFlightDepartureIcao.toUpperCase());
      }
      if (se.groupFlightArrivalIcao) set.add(se.groupFlightArrivalIcao.toUpperCase());
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
      return new Set(airportStatuses[icao.toUpperCase()]?.outboundFlights || []);
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

    eventSubEvents.forEach((subEvent) => {
      const signupsForSubEvent = eventFlightSignups.filter(
        (signup) => signup.subEventId === subEvent.subEventId
      );

      if (
        subEvent.subEventType.tag === SubEventType.GroupFlight.tag &&
        subEvent.groupFlightDepartureIcao &&
        subEvent.groupFlightArrivalIcao
      ) {
        const outbound = getOutbound(subEvent.groupFlightDepartureIcao);
        const inbound = getInbound(subEvent.groupFlightArrivalIcao);
        intersection(outbound, inbound).forEach((id) => nextIds.add(id));
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
          const depIcao = signup.departureIcao;
          if (!depIcao) {
            getInbound(subEvent.hubIcao).forEach((id) => nextIds.add(id));
            return;
          }

          const outbound = getOutbound(depIcao);
          const inbound = getInbound(subEvent.hubIcao);
          intersection(outbound, inbound).forEach((id) => nextIds.add(id));
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
          const arrIcao = signup.arrivalIcao;
          if (!arrIcao) {
            getOutbound(subEvent.hubIcao).forEach((id) => nextIds.add(id));
            return;
          }

          const outbound = getOutbound(subEvent.hubIcao);
          const inbound = getInbound(arrIcao);
          intersection(outbound, inbound).forEach((id) => nextIds.add(id));
        });
      }
    });

    setCandidateFlightIds(nextIds);
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
    const map = new Map<string, string[]>();
    for (const filter of callsignFilters) {
      const groupId = filter.groupId.toString();
      if (!attendingGroupIds.has(groupId)) continue;
      const current = map.get(groupId) || [];
      current.push(filter.words);
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
    const results: Array<ApiFlight & { matchedGroupId: bigint; matchedColor: string }> = [];

    const requiresAirportFilter = relevantIcaos.length > 0;
    const candidateFilteredFlights = requiresAirportFilter
      ? flights.filter((flight) =>
          candidateFlightIds.has(String(flight.flight_id).toLowerCase())
        )
      : [];

    for (const flight of candidateFilteredFlights) {
      let matchedGroupId: bigint | null = null;
      let matchedColor = "#4A5568";

      for (const [groupId, filters] of callsignFiltersByGroup.entries()) {
        if (filters.some((filter) => callsignMatchesFilter(flight.callsign, filter))) {
          const group = groupMap.get(groupId);
          matchedGroupId = group?.groupId || null;
          matchedColor = group?.color || "#4A5568";
          break;
        }
      }

      if (matchedGroupId) {
        results.push({
          ...flight,
          matchedGroupId,
          matchedColor,
        });
      }
    }

    return results;
  }, [flights, callsignFiltersByGroup, groupMap, candidateFlightIds, relevantIcaos]);

  return {
    event,
    eventSubEvents,
    eventFlightSignups,
    attendingGroups,
    groupMap,
    filteredFlights,
  };
};

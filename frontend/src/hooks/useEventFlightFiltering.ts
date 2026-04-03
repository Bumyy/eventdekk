import { useMemo } from "react";
import {
  useEvents,
  useEventParticipants,
  useFlightSignups,
  useGroups,
  useSubEvents,
  useAllGroupCallsignFilters,
} from "@/hooks/spacetimeHooks";

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

    for (const flight of flights) {
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
  }, [flights, callsignFiltersByGroup, groupMap]);

  return {
    event,
    eventSubEvents,
    eventFlightSignups,
    attendingGroups,
    groupMap,
    filteredFlights,
  };
};

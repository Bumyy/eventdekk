import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { Timestamp } from "spacetimedb";
import { tables } from "../module_bindings";
import { useMemo } from "react";

type DateLike = { toDate: () => Date };

const toMillis = (value: DateLike) => value.toDate().getTime();

export const selectSubEventsForGroup = <
  TEvent extends { eventId: bigint },
  TSubEvent extends { eventId: bigint; scheduledStartTime: DateLike },
>(
  events: readonly TEvent[] | undefined,
  allSubEvents: readonly TSubEvent[] | undefined
): TSubEvent[] => {
  if (!events || !allSubEvents) return [];

  const groupEventIds = new Set(events.map((e) => e.eventId));

  return [...allSubEvents]
    .filter((se) => groupEventIds.has(se.eventId))
    .sort(
      (a, b) => toMillis(a.scheduledStartTime) - toMillis(b.scheduledStartTime)
    );
};

export const selectSubEventsForEvents = <
  TSubEvent extends { eventId: bigint; scheduledStartTime: DateLike },
>(
  eventIds: readonly bigint[],
  singleEventRows: readonly TSubEvent[] | undefined,
  allSubEvents: readonly TSubEvent[] | undefined
): TSubEvent[] => {
  if (!eventIds || eventIds.length === 0) return [];

  if (eventIds.length === 1 && singleEventRows) {
    return [...singleEventRows].sort(
      (a, b) => toMillis(a.scheduledStartTime) - toMillis(b.scheduledStartTime)
    );
  }

  if (!allSubEvents) return [];

  const eventIdSet = new Set(eventIds);
  return [...allSubEvents]
    .filter((se) => eventIdSet.has(se.eventId))
    .sort(
      (a, b) => toMillis(a.scheduledStartTime) - toMillis(b.scheduledStartTime)
    );
};

const EXCLUDED_EVENT_STATUSES = ["Cancelled", "Internal", "Draft"];

export const selectAllActiveEvents = <
  TEvent extends { status: { tag: string }; startTime: DateLike },
>(
  events: readonly TEvent[] | undefined
): TEvent[] => {
  if (!events) return [];
  return [...events]
    .filter((event) => !EXCLUDED_EVENT_STATUSES.includes(event.status.tag))
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime));
};

export const selectGroupRelatedEvents = <
  THostedEvent extends { eventId: bigint },
  TParticipant extends { eventId: bigint; status: { tag: string } },
  TEvent extends {
    eventId: bigint;
    status: { tag: string };
    startTime: DateLike;
  },
>(
  groupId: bigint | null,
  hostedEvents: readonly THostedEvent[] | undefined,
  eventParticipants: readonly TParticipant[] | undefined,
  allEvents: readonly TEvent[] | undefined
): TEvent[] => {
  if (!groupId || !allEvents || !eventParticipants || !hostedEvents) return [];

  const hostedEventIds = new Set(hostedEvents.map((event) => event.eventId));
  const acceptedEventIds = new Set(
    eventParticipants
      .filter((participant) => participant.status.tag === "Accepted")
      .map((participant) => participant.eventId)
  );

  return [...allEvents]
    .filter(
      (event) =>
        (hostedEventIds.has(event.eventId) ||
          acceptedEventIds.has(event.eventId)) &&
        event.status.tag !== "Cancelled"
    )
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime));
};

export const selectUpcomingAttendingEvents = <
  TParticipant extends { eventId: bigint; status: { tag: string } },
  TEvent extends { eventId: bigint; startTime: DateLike },
>(
  events: readonly TEvent[] | undefined,
  eventParticipants: readonly TParticipant[] | undefined
): TEvent[] => {
  if (!events || !eventParticipants) return [];
  const acceptedEventIds = new Set(
    eventParticipants
      .filter((ep) => ep.status.tag === "Accepted")
      .map((ep) => ep.eventId)
  );
  return [...events]
    .filter((event) => acceptedEventIds.has(event.eventId))
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime));
};

export const selectPendingEventInvitations = <
  TParticipant extends { eventId: bigint; status: { tag: string } },
  TEvent extends { eventId: bigint; startTime: DateLike },
>(
  events: readonly TEvent[] | undefined,
  eventParticipants: readonly TParticipant[] | undefined
): TEvent[] => {
  if (!eventParticipants || !events) return [];
  const pendingEventIds = new Set(
    eventParticipants
      .filter((p) => p.status.tag === "Pending")
      .map((p) => p.eventId)
  );
  return [...events]
    .filter((e) => pendingEventIds.has(e.eventId))
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime));
};

export const selectGroupMembersForGroup = <
  TMembership extends { userIdentity: { toHexString: () => string } },
  TUser extends { identity: { toHexString: () => string } },
>(
  memberships: readonly TMembership[] | undefined,
  users: readonly TUser[] | undefined
): Array<{ membership: TMembership; user: TUser | undefined }> => {
  if (!memberships || !users) return [];

  return [...memberships].map((m) => {
    const user = users.find(
      (u) => u.identity.toHexString() === m.userIdentity.toHexString()
    );
    return {
      membership: m,
      user,
    };
  });
};

export const useCurrentUser = () => {
  const { identity } = useSpacetimeDB();

  // If identity is undefined, default to the whole table so the hook doesn't crash.
  const query = identity
    ? tables.user.where((r) => r.identity.eq(identity))
    : tables.user.where((r) => r.displayName.eq(""));

  const [rows] = useTable(query);

  return rows[0];
};

export const useGroups = () => {
  const [rows] = useTable(tables.group);
  return rows;
};

export const useSuperAdmins = () => {
  const [rows] = useTable(tables.super_admin);
  console.log(rows);
  return rows;
};

export const useHasSuperAdmins = () => {
  const superAdmins = useSuperAdmins();
  return useMemo(() => superAdmins.length > 0, [superAdmins]);
};

export const useIsSuperAdmin = () => {
  const { identity } = useSpacetimeDB();
  const superAdmins = useSuperAdmins();

  return useMemo(() => {
    if (!identity) return false;
    return superAdmins.some(
      (admin) => admin.identity.toHexString() === identity.toHexString()
    );
  }, [identity, superAdmins]);
};

export const useGroupApplications = () => {
  const [rows] = useTable(tables.group_application);
  console.log(rows);
  return rows;
};

/**
 * Get a specific group by ID
 * Uses server-side subscription with .where() for efficient filtering
 */
export const useGroupById = (groupId: bigint | null) => {
  const query = groupId
    ? tables.group.where((r) => r.groupId.eq(groupId))
    : tables.group.where((r) => r.groupId.eq(0n));

  const [rows] = useTable(query);
  // This line is needed due to a bug in SpacetimeDB react SDK, do not remove
  const [allGroups] = useTable(tables.group);

  return useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return rows[0];
  }, [rows]);
};

export const useGroupMemberships = () => {
  const [rows] = useTable(tables.group_membership);
  return rows;
};

export const useGroupCallsignFilters = (groupId: bigint | null) => {
  const query = useMemo(
    () =>
      groupId
        ? tables.group_callsign_filter.where((r) => r.groupId.eq(groupId))
        : tables.group_callsign_filter.where((r) => r.groupId.eq(0n)),
    [groupId]
  );

  const [filters] = useTable(query);
  // This line is needed due to a bug in SpacetimeDB react SDK, do not remove
  const [allFilters] = useTable(tables.group_callsign_filter);

  return useMemo(() => {
    if (!filters) return [];
    return [...filters].sort((a, b) => Number(a.filterId - b.filterId));
  }, [filters]);
};

export const useAllGroupCallsignFilters = () => {
  const [rows] = useTable(tables.group_callsign_filter);
  return rows;
};

export const useUsers = () => {
  const [rows] = useTable(tables.user);
  return rows;
};

export const useEvents = () => {
  const [rows] = useTable(tables.event);
  return rows;
};

export const useEventParticipants = () => {
  const [rows] = useTable(tables.event_participant);
  return rows;
};

/**
 * Event participants for a specific event
 * Uses server-side subscription with .where() for efficient filtering
 */
export const useEventParticipantsForEvent = (eventId: bigint | null) => {
  const query = useMemo(
    () =>
      eventId
        ? tables.event_participant.where((ep) => ep.eventId.eq(eventId))
        : tables.event_participant.where((ep) => ep.eventId.eq(0n)),
    [eventId]
  );

  const [participants] = useTable(query);
  // This line is needed due to a bug in SpacetimeDB react SDK, do not remove
  const [allParticipants] = useTable(tables.event_participant);

  return useMemo(() => {
    if (!participants) return [];
    return [...participants];
  }, [participants]);
};

export const useSubEvents = () => {
  const [rows] = useTable(tables.sub_event);
  return rows;
};

/**
 * Sub-events for events hosted by a specific group
 * Uses server-side subscription with .where() for efficient filtering
 * First filters events by creatorGroupId, then gets sub_events for those events
 */
export const useSubEventsForGroup = (groupId: bigint | null) => {
  // First get the events hosted by this group
  const eventsQuery = groupId
    ? tables.event.where((r) => r.creatorGroupId.eq(groupId))
    : tables.event.where((r) => r.creatorGroupId.eq(0n));

  const [events] = useTable(eventsQuery);

  // Then get all sub_events and filter by the events hosted by this group
  const [allSubEvents] = useTable(tables.sub_event);
  // This line is needed due to a bug in SpacetimeDB react SDK, do not remove
  const [allEvents] = useTable(tables.event);

  return useMemo(() => {
    return selectSubEventsForGroup(events, allSubEvents);
  }, [events, allSubEvents]);
};

/**
 * TODO: Make this more efficient
 * Sub-events for a specific set of events
 * Uses server-side subscription with .where() for efficient filtering when possible
 * - For single event ID: uses direct server-side .eq() filtering
 * - For multiple event IDs: fetches all sub_events and filters client-side with Set lookup
 */
export const useSubEventsForEvents = (eventIds: bigint[]) => {
  // If no events provided, return empty
  const isEmpty = !eventIds || eventIds.length === 0;

  // For a single event, use direct server-side filtering
  const singleEventQuery = isEmpty
    ? tables.sub_event.where((r) => r.eventId.eq(0n))
    : eventIds.length === 1
      ? tables.sub_event.where((r) => r.eventId.eq(eventIds[0]))
      : tables.sub_event.where((r) => r.eventId.eq(0n));

  // For multiple events, we need to fetch all sub_events and filter client-side
  // This is still more efficient than fetching ALL sub_events as we limit the scope
  const [allSubEvents] = useTable(tables.sub_event);

  // Use the filtered query for single event case
  const [rows] = useTable(singleEventQuery);

  // This line is needed due to a bug in SpacetimeDB react SDK, do not remove
  const [allSubEventsDummy] = useTable(tables.sub_event);

  return useMemo(() => {
    return selectSubEventsForEvents(eventIds, rows, allSubEvents);
  }, [eventIds, rows, allSubEvents, isEmpty]);
};

export const useFlightSignups = () => {
  const [rows] = useTable(tables.flight_signup);
  return rows;
};

/**
 * Flight signups for a specific group
 * Uses server-side subscription with .where() for efficient filtering
 */
export const useFlightSignupsForGroup = (groupId: bigint | null) => {
  const query = groupId
    ? tables.flight_signup.where((r) => r.groupId.eq(groupId))
    : tables.flight_signup.where((r) => r.groupId.eq(0n));

  const [signups] = useTable(query);
  // This line is needed due to a bug in SpacetimeDB react SDK, do not remove
  const [allSignups] = useTable(tables.flight_signup);

  return useMemo(() => {
    if (!signups) return [];
    return [...signups];
  }, [signups]);
};

export const useLiveFlights = () => {
  const [rows] = useTable(tables.live_flight);
  return rows;
};

export const useDiscoveryEvents = () => {
  const [rows] = useTable(tables.discovery_event);
  return rows;
};

export const useLiveChatMessages = () => {
  const [rows] = useTable(tables.live_chat_message);
  return rows;
};

// ============ Filtered Hooks for Admin Events ============

/**
 * All non-cancelled events across all groups.
 * Useful for global scheduling suggestions.
 */
export const useAllActiveEvents = () => {
  const [events] = useTable(tables.event);

  return useMemo(() => {
    return selectAllActiveEvents(events);
  }, [events]);
};

/**
 * All non-cancelled events relevant to a specific group.
 * Includes:
 * - Events hosted by the group
 * - Events where the group is an accepted participant
 */
export const useGroupRelatedEvents = (groupId: bigint | null) => {
  const hostedEventsQuery = useMemo(
    () =>
      groupId
        ? tables.event.where((e) => e.creatorGroupId.eq(groupId))
        : tables.event.where((e) => e.eventId.eq(0n)),
    [groupId]
  );

  const participantQuery = useMemo(
    () =>
      groupId
        ? tables.event_participant.where((ep) => ep.groupId.eq(groupId))
        : tables.event_participant.where((ep) => ep.groupId.eq(0n)),
    [groupId]
  );

  const [hostedEvents] = useTable(hostedEventsQuery);
  const [eventParticipants] = useTable(participantQuery);
  const [allEvents] = useTable(tables.event);
  const [allEventParticipant] = useTable(tables.event_participant);

  return useMemo(() => {
    return selectGroupRelatedEvents(
      groupId,
      hostedEvents,
      eventParticipants,
      allEvents
    );
  }, [groupId, allEvents, eventParticipants, hostedEvents]);
};

/**
 * Upcoming events hosted by a specific group (where endTime > now)
 * Uses server-side subscription with .where() for efficient filtering
 */
export const useUpcomingHostedEvents = (groupId: bigint | null) => {
  const query = useMemo(() => {
    const now = Timestamp.fromDate(new Date());
    return groupId
      ? tables.event.where((r) =>
          r.creatorGroupId.eq(groupId).and(r.endTime.gt(now))
        )
      : tables.event.where((r) => r.creatorGroupId.eq(0n));
  }, [groupId]);

  const [events] = useTable(query);
  const [allEvents] = useTable(tables.event);

  return useMemo(() => {
    if (!events) return [];
    return [...events]
      .filter((e) => e.status.tag !== "Cancelled")
      .sort(
        (a, b) =>
          a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
      );
  }, [events]);
};

export const useUpcomingAttendingEvents = (groupId: bigint | null) => {
  const participantsQuery = useMemo(
    () =>
      groupId
        ? tables.event_participant.where((ep) => ep.groupId.eq(groupId))
        : tables.event_participant.where((ep) => ep.groupId.eq(0n)),
    [groupId]
  );

  const [eventParticipants] = useTable(participantsQuery);

  const eventsQuery = useMemo(() => {
    const now = Timestamp.fromDate(new Date());
    return groupId
      ? tables.event
          .where((e) => e.endTime.gt(now))
          .where((e) => e.creatorGroupId.ne(groupId))
      : tables.event.where((e) => e.eventId.eq(0n));
  }, [groupId]);

  const [events] = useTable(eventsQuery);

  return useMemo(() => {
    return selectUpcomingAttendingEvents(events, eventParticipants);
  }, [events, eventParticipants]);
};

export const usePastHostedEvents = (groupId: bigint | null) => {
  const query = useMemo(() => {
    const now = Timestamp.fromDate(new Date());
    return groupId
      ? tables.event
          .where((r) => r.creatorGroupId.eq(groupId))
          .where((r) => r.endTime.lte(now))
      : tables.event.where((r) => r.creatorGroupId.eq(0n));
  }, [groupId]);

  const [events] = useTable(query);

  return useMemo(() => {
    if (!events) return [];
    return [...events].sort(
      (a, b) => b.startTime.toDate().getTime() - a.startTime.toDate().getTime()
    );
  }, [events]);
};

export const usePendingEventInvitations = (groupId: bigint | null) => {
  const query = useMemo(
    () =>
      groupId
        ? tables.event_participant
            .where((ep) => ep.groupId.eq(groupId))
            .rightSemijoin(tables.event, (ep, e) => ep.eventId.eq(e.eventId))
        : tables.event.where((e) => e.eventId.eq(0n)),
    [groupId]
  );

  const [events] = useTable(query);

  const participantsQuery = useMemo(
    () =>
      groupId
        ? tables.event_participant.where((ep) => ep.groupId.eq(groupId))
        : tables.event_participant.where((ep) => ep.groupId.eq(0n)),
    [groupId]
  );

  const [eventParticipants] = useTable(participantsQuery);
  const [allEvents] = useTable(tables.event);
  const [allEventParticipant] = useTable(tables.event_participant);

  return useMemo(() => {
    return selectPendingEventInvitations(events, eventParticipants);
  }, [events, eventParticipants]);
};

export const useGroupMembersForGroup = (groupId: bigint | null) => {
  const query = useMemo(() => {
    return groupId
      ? tables.group_membership.where((r) => r.groupId.eq(groupId))
      : tables.group_membership.where((r) => r.groupId.eq(0n));
  }, [groupId]);

  const [memberships] = useTable(query);
  const [users] = useTable(tables.user);
  const [allMemberships] = useTable(tables.group_membership);

  return useMemo(() => {
    return selectGroupMembersForGroup(memberships, users);
  }, [memberships, users]);
};

export const useGroupLeadMembersForGroup = (groupId: bigint | null) => {
  const query = useMemo(() => {
    return groupId
      ? tables.group_membership.where((r) => r.groupId.eq(groupId))
      : tables.group_membership.where((r) => r.groupId.eq(0n));
  }, [groupId]);

  const [memberships] = useTable(query);
  const [users] = useTable(tables.user);
  //const [allMemberships] = useTable(tables.group_membership);

  return useMemo(() => {
    const leadMemberships = (memberships || []).filter((membership) => {
      const permissionTag = membership.permissionLevel.tag;
      return permissionTag === "Staff" || permissionTag === "Ceo";
    });

    return selectGroupMembersForGroup(leadMemberships, users);
  }, [memberships, users]);
};

export interface GroupAvailabilityData {
  hostedEvents: ReturnType<typeof useUpcomingHostedEvents> extends Array<
    infer T
  >
    ? T[]
    : never;
  attendingEvents: ReturnType<typeof useUpcomingAttendingEvents> extends Array<
    infer T
  >
    ? T[]
    : never;
  hostedSubEvents: ReturnType<typeof useSubEventsForGroup> extends Array<
    infer T
  >
    ? T[]
    : never;
}

export const useGroupAvailabilityData = (
  groupId: bigint | null
): GroupAvailabilityData => {
  const hostedEvents = useUpcomingHostedEvents(groupId);
  const attendingEvents = useUpcomingAttendingEvents(groupId);
  const hostedSubEvents = useSubEventsForGroup(groupId);

  return useMemo(
    () => ({
      hostedEvents: hostedEvents || [],
      attendingEvents: attendingEvents || [],
      hostedSubEvents: hostedSubEvents || [],
    }),
    [hostedEvents, attendingEvents, hostedSubEvents]
  );
};

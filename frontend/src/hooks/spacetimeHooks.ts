// src/hooks/spacetimedbHooks.ts
import { useState, useEffect } from "react";
import { DbConnection, EventContext } from "../module_bindings"; // Adjust path as needed

// Import your table types
import {
  Group,
  GroupMembership,
  User, // Assuming you might want a useUsers hook too
  Event,
  EventParticipant,
  SubEvent,
  FlightSignup,
  LiveFlight,
  DiscoveryEvent,
  LiveChatMessage,
} from "../module_bindings";

// --- Hook for Groups ---
export function useGroups(connection: DbConnection | null): Group[] {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!connection) {
      setGroups([]);
      return;
    }
    // Initialize groups from current cache
    const currentGroups = Array.from(connection.db.group.iter());
    setGroups(currentGroups);

    const handleInsert = (_ctx: EventContext, group: Group) => {
      setGroups((prev) => {
        // Check if group already exists
        const exists = prev.some((g) => g.groupId === group.groupId);
        if (exists) {
          return prev;
        }
        return [...prev, group];
      });
    };
    const handleUpdate = (
      _ctx: EventContext,
      _oldGroup: Group,
      newGroup: Group
    ) => {
      setGroups((prev) =>
        prev.map((g) => (g.groupId === newGroup.groupId ? newGroup : g))
      );
    };
    const handleDelete = (_ctx: EventContext, deletedGroup: Group) => {
      setGroups((prev) =>
        prev.filter((g) => g.groupId !== deletedGroup.groupId)
      );
    };

    connection.db.group.onInsert(handleInsert);
    connection.db.group.onUpdate(handleUpdate);
    connection.db.group.onDelete(handleDelete);

    return () => {
      connection?.db.group.removeOnInsert(handleInsert);
      connection?.db.group.removeOnUpdate(handleUpdate);
      connection?.db.group.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return groups;
}

// --- Hook for Group Memberships ---
export function useGroupMemberships(
  connection: DbConnection | null
): GroupMembership[] {
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);

  useEffect(() => {
    if (!connection) {
      setMemberships([]);
      return;
    }
    setMemberships(Array.from(connection.db.groupMembership.iter()));

    const handleInsert = (_ctx: EventContext, membership: GroupMembership) => {
      setMemberships((prev) => [...prev, membership]);
    };
    const handleUpdate = (
      _ctx: EventContext,
      _old: GroupMembership,
      newMembership: GroupMembership
    ) => {
      setMemberships((prev) =>
        prev.map((m) =>
          m.membershipId === newMembership.membershipId ? newMembership : m
        )
      );
    };
    const handleDelete = (_ctx: EventContext, deleted: GroupMembership) => {
      setMemberships((prev) =>
        prev.filter((m) => m.membershipId !== deleted.membershipId)
      );
    };

    connection.db.groupMembership.onInsert(handleInsert);
    connection.db.groupMembership.onUpdate(handleUpdate);
    connection.db.groupMembership.onDelete(handleDelete);

    return () => {
      connection?.db.groupMembership.removeOnInsert(handleInsert);
      connection?.db.groupMembership.removeOnUpdate(handleUpdate);
      connection?.db.groupMembership.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return memberships;
}

// --- Hook for Users --- (Similar to example)
export function useUsers(connection: DbConnection | null): User[] {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!connection) {
      setUsers([]);
      return;
    }
    setUsers(Array.from(connection.db.user.iter()));

    const handleInsert = (_ctx: EventContext, user: User) => {
      setUsers((prev) => [...prev, user]);
    };
    const handleUpdate = (_ctx: EventContext, oldUser: User, newUser: User) => {
      // User PK is identity, which shouldn't change, so update is safe
      setUsers((prev) =>
        prev.map((u) =>
          u.identity.toHexString() === newUser.identity.toHexString()
            ? newUser
            : u
        )
      );
    };
    const handleDelete = (_ctx: EventContext, deletedUser: User) => {
      setUsers((prev) =>
        prev.filter((u) => u.identity !== deletedUser.identity)
      );
    };

    connection.db.user.onInsert(handleInsert);
    connection.db.user.onUpdate(handleUpdate);
    connection.db.user.onDelete(handleDelete); // Note: Users might not be deletable in your logic

    return () => {
      connection?.db.user.removeOnInsert(handleInsert);
      connection?.db.user.removeOnUpdate(handleUpdate);
      connection?.db.user.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return users;
}

// --- Hook for Events ---
export function useEvents(connection: DbConnection | null): Event[] {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!connection) {
      //setEvents([]);
      return;
    }
    setEvents(Array.from(connection.db.event.iter()));

    const handleInsert = (_ctx: EventContext, event: Event) => {
      setEvents((prev) => [...prev, event]);
    };
    const handleUpdate = (_ctx: EventContext, _old: Event, newEvent: Event) => {
      setEvents((prev) =>
        prev.map((e) => (e.eventId === newEvent.eventId ? newEvent : e))
      );
    };
    const handleDelete = (_ctx: EventContext, deleted: Event) => {
      setEvents((prev) => prev.filter((e) => e.eventId !== deleted.eventId));
    };

    connection.db.event.onInsert(handleInsert);
    connection.db.event.onUpdate(handleUpdate);
    connection.db.event.onDelete(handleDelete);

    return () => {
      connection?.db.event.removeOnInsert(handleInsert);
      connection?.db.event.removeOnUpdate(handleUpdate);
      connection?.db.event.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return events;
}

// --- Hook for Event Participants ---
export function useEventParticipants(
  connection: DbConnection | null
): EventParticipant[] {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);

  useEffect(() => {
    if (!connection) {
      setParticipants([]);
      return;
    }
    setParticipants(Array.from(connection.db.eventParticipant.iter()));

    const handleInsert = (
      _ctx: EventContext,
      participant: EventParticipant
    ) => {
      setParticipants((prev) => [...prev, participant]);
    };
    const handleUpdate = (
      _ctx: EventContext,
      _old: EventParticipant,
      newParticipant: EventParticipant
    ) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.participationId === newParticipant.participationId
            ? newParticipant
            : p
        )
      );
    };
    const handleDelete = (_ctx: EventContext, deleted: EventParticipant) => {
      setParticipants((prev) =>
        prev.filter((p) => p.participationId !== deleted.participationId)
      );
    };

    connection.db.eventParticipant.onInsert(handleInsert);
    connection.db.eventParticipant.onUpdate(handleUpdate);
    connection.db.eventParticipant.onDelete(handleDelete);

    return () => {
      connection?.db.eventParticipant.removeOnInsert(handleInsert);
      connection?.db.eventParticipant.removeOnUpdate(handleUpdate);
      connection?.db.eventParticipant.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return participants;
}

// --- Hook for SubEvents ---
export function useSubEvents(connection: DbConnection | null): SubEvent[] {
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);

  useEffect(() => {
    if (!connection) {
      setSubEvents([]);
      return;
    }
    setSubEvents(Array.from(connection.db.subEvent.iter()));

    const handleInsert = (_ctx: EventContext, subEvent: SubEvent) => {
      setSubEvents((prev) => [...prev, subEvent]);
    };
    const handleUpdate = (
      _ctx: EventContext,
      _old: SubEvent,
      newSubEvent: SubEvent
    ) => {
      setSubEvents((prev) =>
        prev.map((s) =>
          s.subEventId === newSubEvent.subEventId ? newSubEvent : s
        )
      );
    };
    const handleDelete = (_ctx: EventContext, deleted: SubEvent) => {
      setSubEvents((prev) =>
        prev.filter((s) => s.subEventId !== deleted.subEventId)
      );
    };

    connection.db.subEvent.onInsert(handleInsert);
    connection.db.subEvent.onUpdate(handleUpdate);
    connection.db.subEvent.onDelete(handleDelete);

    return () => {
      connection?.db.subEvent.removeOnInsert(handleInsert);
      connection?.db.subEvent.removeOnUpdate(handleUpdate);
      connection?.db.subEvent.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return subEvents;
}

// --- Hook for Flight Signups ---
export function useFlightSignups(
  connection: DbConnection | null
): FlightSignup[] {
  const [signups, setSignups] = useState<FlightSignup[]>([]);

  useEffect(() => {
    if (!connection) {
      setSignups([]);
      return;
    }
    setSignups(Array.from(connection.db.flightSignup.iter()));

    const handleInsert = (_ctx: EventContext, signup: FlightSignup) => {
      setSignups((prev) => [...prev, signup]);
    };
    const handleUpdate = (
      _ctx: EventContext,
      _old: FlightSignup,
      newSignup: FlightSignup
    ) => {
      setSignups((prev) =>
        prev.map((s) => (s.signupId === newSignup.signupId ? newSignup : s))
      );
    };
    const handleDelete = (_ctx: EventContext, deleted: FlightSignup) => {
      setSignups((prev) => prev.filter((s) => s.signupId !== deleted.signupId));
    };

    connection.db.flightSignup.onInsert(handleInsert);
    connection.db.flightSignup.onUpdate(handleUpdate);
    connection.db.flightSignup.onDelete(handleDelete);

    return () => {
      connection?.db.flightSignup.removeOnInsert(handleInsert);
      connection?.db.flightSignup.removeOnUpdate(handleUpdate);
      connection?.db.flightSignup.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return signups;
}

// --- Hook for Live Flights ---
export function useLiveFlights(connection: DbConnection | null): LiveFlight[] {
  const [liveFlights, setLiveFlights] = useState<LiveFlight[]>([]);

  useEffect(() => {
    if (!connection) {
      setLiveFlights([]);
      return;
    }
    setLiveFlights(Array.from(connection.db.liveFlight.iter()));

    const handleInsert = (_ctx: EventContext, flight: LiveFlight) => {
      setLiveFlights((prev) => [...prev, flight]);
    };
    const handleUpdate = (
      _ctx: EventContext,
      _old: LiveFlight,
      newFlight: LiveFlight
    ) => {
      // PK is callsign (string)
      setLiveFlights((prev) =>
        prev.map((f) => (f.callsign === newFlight.callsign ? newFlight : f))
      );
    };
    const handleDelete = (_ctx: EventContext, deleted: LiveFlight) => {
      // PK is callsign (string)
      setLiveFlights((prev) =>
        prev.filter((f) => f.callsign !== deleted.callsign)
      );
    };

    connection.db.liveFlight.onInsert(handleInsert);
    connection.db.liveFlight.onUpdate(handleUpdate);
    connection.db.liveFlight.onDelete(handleDelete);

    return () => {
      connection?.db.liveFlight.removeOnInsert(handleInsert);
      connection?.db.liveFlight.removeOnUpdate(handleUpdate);
      connection?.db.liveFlight.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return liveFlights;
}

// --- Hook for Discovery Events ---
export function useDiscoveryEvents(
  connection: DbConnection | null
): DiscoveryEvent[] {
  const [discoveryEvents, setDiscoveryEvents] = useState<DiscoveryEvent[]>([]);

  useEffect(() => {
    if (!connection) {
      setDiscoveryEvents([]);
      return;
    }
    // Populate initial state and sort it immediately
    const initialData = Array.from(connection.db.discoveryEvent.iter());
    initialData.sort(
      (a, b) => Number(a.displayPriority) - Number(b.displayPriority)
    );
    setDiscoveryEvents(initialData);

    const handleInsert = (_ctx: EventContext, event: DiscoveryEvent) => {
      // Insert and re-sort
      setDiscoveryEvents((prev) => {
        const newState = [...prev, event];
        newState.sort(
          (a, b) => Number(a.displayPriority) - Number(b.displayPriority)
        );
        return newState;
      });
    };
    const handleUpdate = (
      _ctx: EventContext,
      _old: DiscoveryEvent,
      newEvent: DiscoveryEvent
    ) => {
      // Update and re-sort
      setDiscoveryEvents((prev) => {
        const newState = prev.map((e) =>
          e.eventId === newEvent.eventId ? newEvent : e
        );
        newState.sort(
          (a, b) => Number(a.displayPriority) - Number(b.displayPriority)
        );
        return newState;
      });
    };
    const handleDelete = (_ctx: EventContext, deleted: DiscoveryEvent) => {
      // Filter (already sorted)
      setDiscoveryEvents((prev) =>
        prev.filter((e) => e.eventId !== deleted.eventId)
      );
    };

    connection.db.discoveryEvent.onInsert(handleInsert);
    connection.db.discoveryEvent.onUpdate(handleUpdate);
    connection.db.discoveryEvent.onDelete(handleDelete);

    return () => {
      connection?.db.discoveryEvent.removeOnInsert(handleInsert);
      connection?.db.discoveryEvent.removeOnUpdate(handleUpdate);
      connection?.db.discoveryEvent.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return discoveryEvents;
}

// --- Hook for Live Chat Messages ---
export function useLiveChatMessages(
  connection: DbConnection | null
): LiveChatMessage[] {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);

  useEffect(() => {
    if (!connection) {
      setMessages([]);
      return;
    }
    // Populate initial state without sorting
    const initialData = Array.from(connection.db.liveChatMessage.iter());
    setMessages(initialData);

    const handleInsert = (_ctx: EventContext, message: LiveChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleUpdate = (
      _ctx: EventContext,
      _old: LiveChatMessage,
      newMessage: LiveChatMessage
    ) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === newMessage.messageId ? newMessage : m))
      );
    };

    const handleDelete = (_ctx: EventContext, deleted: LiveChatMessage) => {
      setMessages((prev) =>
        prev.filter((m) => m.messageId !== deleted.messageId)
      );
    };

    connection.db.liveChatMessage.onInsert(handleInsert);
    connection.db.liveChatMessage.onUpdate(handleUpdate);
    connection.db.liveChatMessage.onDelete(handleDelete);

    return () => {
      connection?.db.liveChatMessage.removeOnInsert(handleInsert);
      connection?.db.liveChatMessage.removeOnUpdate(handleUpdate);
      connection?.db.liveChatMessage.removeOnDelete(handleDelete);
    };
  }, [connection]);

  return messages;
}

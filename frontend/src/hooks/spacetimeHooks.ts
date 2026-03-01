import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { tables } from "../module_bindings";

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

export const useGroupMemberships = () => {
  const [rows] = useTable(tables.group_membership);
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

export const useSubEvents = () => {
  const [rows] = useTable(tables.sub_event);
  return rows;
};

export const useFlightSignups = () => {
  const [rows] = useTable(tables.flight_signup);
  return rows;
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

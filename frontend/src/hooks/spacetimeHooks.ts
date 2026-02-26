import { useTable } from "spacetimedb/react";
import { tables } from "../module_bindings";

export const useGroups = () => {
  const [rows] = useTable(tables.group);
  return rows;
};

export const useGroupMemberships = () => {
  const [rows] = useTable(tables.groupMembership);
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
  const [rows] = useTable(tables.eventParticipant);
  return rows;
};

export const useSubEvents = () => {
  const [rows] = useTable(tables.subEvent);
  return rows;
};

export const useFlightSignups = () => {
  const [rows] = useTable(tables.flightSignup);
  return rows;
};

export const useLiveFlights = () => {
  const [rows] = useTable(tables.liveFlight);
  return rows;
};

export const useDiscoveryEvents = () => {
  const [rows] = useTable(tables.discoveryEvent);
  return rows;
};

export const useLiveChatMessages = () => {
  const [rows] = useTable(tables.liveChatMessage);
  return rows;
};

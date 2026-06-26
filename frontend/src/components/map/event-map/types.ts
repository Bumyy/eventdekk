import { Group, FlightSignup, SubEvent } from "@/module_bindings/types";

export interface Airport {
  id: number;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface EventMapFlight {
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
  matchedGroupId?: bigint;
  matchedColor?: string;
  matchedLabel?: string;
}

export type ActivePopupInfo = {
  type: "airport" | "flight" | "route";
  data: any;
  longitude: number;
  latitude: number;
} | null;

export type EventMapPopupContext = {
  subEvents: SubEvent[];
  flightSignups: FlightSignup[];
  groupMap: Map<string, Group>;
  getAirport: (icao: string | undefined) => Airport | undefined;
  formatTimeRange: (start: any, end: any) => string;
};

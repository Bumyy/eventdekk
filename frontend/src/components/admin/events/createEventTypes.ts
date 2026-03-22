import { SubEventType } from "@/module_bindings/types";

export interface SubEventFormData {
  subEventType: SubEventType;
  name: string;
  description: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  hubIcao?: string;
  groupFlightDepartureIcao?: string;
  groupFlightArrivalIcao?: string;
  groupFlightRoute?: string;
  notes?: string;
  eventLeadHex?: string;
}

export interface EventFormData {
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isInternal: boolean;
  ifcEventLink?: string;
  bannerUrl?: string;
  subEvents: SubEventFormData[];
}

export type SubEventFormType = "GroupFlight" | "FlyIn" | "FlyOut";

export interface SubEventFormState {
  name: string;
  description: string;
  type: SubEventFormType;
  startTime: Date;
  endTime: Date;
  hubIcao: string;
  departureIcao: string;
  arrivalIcao: string;
  route: string;
  notes: string;
  eventLeadHex: string;
}

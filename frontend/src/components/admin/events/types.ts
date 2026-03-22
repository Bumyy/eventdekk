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

export interface MemberOption {
  identityHex: string;
  displayName: string;
  callsignPrefix?: string;
}

export interface SelectedGroup {
  id: bigint;
  name: string;
}

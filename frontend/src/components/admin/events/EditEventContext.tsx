import { createContext, useContext } from "react";
import { Group, FlightSignup, SubEvent, SubEventType } from "@/module_bindings/types";
import { MemberOption, SelectedGroup, SubEventFormState } from "./types";

interface EditEventContextValue {
  userTimezone: string;

  name: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
  ifcEventLink: string;
  isInternal: boolean;
  previewUrl: string | null;
  bannerUrl: string;
  selectedFile: File | null;
  isUploading: boolean;
  isLoading: boolean;
  isAdvancedSubEventsMode: boolean;

  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setStartTime: (value: Date | null) => void;
  setEndTime: (value: Date | null) => void;
  setIfcEventLink: (value: string) => void;
  setIsInternal: (value: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setBannerUrl: (value: string) => void;
  clearBanner: () => void;
  setIsAdvancedSubEventsMode: (value: boolean) => void;

  eventSubEvents: SubEvent[];
  signupsBySubEvent: Record<string, FlightSignup[]>;
  groups: Group[];
  availableInviteGroups: Group[];
  memberOptions: MemberOption[];

  showAddSubEventDialog: boolean;
  setShowAddSubEventDialog: (open: boolean) => void;
  showEditSubEventDialog: boolean;
  setShowEditSubEventDialog: (open: boolean) => void;
  subEventForm: SubEventFormState;
  setSubEventForm: (form: SubEventFormState) => void;
  editSubEventForm: SubEventFormState;
  setEditSubEventForm: (form: SubEventFormState) => void;
  handleAddSubEvent: (formOverride?: SubEventFormState) => void | Promise<void>;
  handleUpdateSubEvent: (formOverride?: SubEventFormState) => void | Promise<void>;
  handleEditSubEventClick: (subEvent: SubEvent) => void;
  handleDeleteSubEvent: (subEventId: bigint) => void | Promise<void>;
  toSubEventFormState: (subEvent: SubEvent) => SubEventFormState;
  updateFirstSubEventFromForm: (formState: SubEventFormState) => void | Promise<void>;

  showInviteGroupsDialog: boolean;
  setShowInviteGroupsDialog: (open: boolean) => void;
  selectedGroups: SelectedGroup[];
  currentGroupId: bigint | null;
  handleSelectGroup: (group: SelectedGroup) => void;
  handleRemoveGroup: (groupId: bigint) => void;
  handleInviteGroups: () => void | Promise<void>;

  showManageOwnFlightsDialog: boolean;
  setShowManageOwnFlightsDialog: (open: boolean) => void;
  selectedOwnSubEvents: bigint[];
  ownFlightDetails: Record<string, any>;
  isSubmittingFlights: boolean;
  handleToggleOwnSubEvent: (subEventId: bigint) => void;
  updateOwnFlightDetail: (subEventId: string, field: string, value: string) => void;
  handleSubmitOwnFlights: () => void | Promise<void>;
}

const EditEventContext = createContext<EditEventContextValue | null>(null);

interface EditEventProviderProps {
  value: EditEventContextValue;
  children: React.ReactNode;
}

export function EditEventProvider({ value, children }: EditEventProviderProps) {
  return (
    <EditEventContext.Provider value={value}>{children}</EditEventContext.Provider>
  );
}

export function useEditEventContext() {
  const context = useContext(EditEventContext);

  if (!context) {
    throw new Error("useEditEventContext must be used within an EditEventProvider");
  }

  return context;
}

export function useOptionalEditEventContext() {
  return useContext(EditEventContext);
}

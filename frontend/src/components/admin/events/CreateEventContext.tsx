import { createContext, useContext } from "react";
import { MemberOption, SubEventFormState } from "./types";
import { EventFormData, SubEventFormData } from "./createEventTypes";

export interface CreateEventContextValue {
  name: string;
  description: string;
  startDateTime: Date | undefined;
  endDateTime: Date | undefined;
  isInternal: boolean;
  ifcEventLink: string;
  bannerUrl: string;
  selectedFile: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  isCreating: boolean;
  subEvents: SubEventFormData[];
  expandedSubEvents: number[];
  userTimezone: string;
  memberOptions: MemberOption[];

  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setStartDateTime: (date: Date | undefined) => void;
  setEndDateTime: (date: Date | undefined) => void;
  setIsInternal: (value: boolean) => void;
  setIfcEventLink: (value: string) => void;
  setBannerUrl: (value: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearBanner: () => void;

  handleAddSubEvent: () => void;
  handleRemoveSubEvent: (index: number) => void;
  handleSetSubEventType: (
    index: number,
    value: "GroupFlight" | "FlyIn" | "FlyOut"
  ) => void;
  toggleSubEventExpansion: (index: number) => void;

  toDialogSubEventFormState: (subEvent: SubEventFormData) => SubEventFormState;
  fromDialogSubEventFormState: (
    state: SubEventFormState,
    previousSubEvent: SubEventFormData
  ) => SubEventFormData;
  updateSubEventFromDialog: (index: number, formState: SubEventFormState) => void;

  handleSubmit: (e: React.FormEvent) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

const CreateEventContext = createContext<CreateEventContextValue | null>(null);

interface CreateEventProviderProps {
  value: CreateEventContextValue;
  children: React.ReactNode;
}

export function CreateEventProvider({ value, children }: CreateEventProviderProps) {
  return (
    <CreateEventContext.Provider value={value}>{children}</CreateEventContext.Provider>
  );
}

export function useCreateEventContext() {
  const context = useContext(CreateEventContext);

  if (!context) {
    throw new Error("useCreateEventContext must be used within a CreateEventProvider");
  }

  return context;
}

export type { EventFormData, SubEventFormData };

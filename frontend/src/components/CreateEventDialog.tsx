import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadImage } from "@/api/apiService";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { SubEventType } from "@/module_bindings/types";
import { useGroupLeadMembersForGroup } from "@/hooks/spacetimeHooks";
import { useUserTimezone } from "@/utils/timezoneUtils";
import {
  CreateEventDialogFooter,
  CreateEventMainDetailsSection,
  CreateEventProvider,
  CreateEventSubEventsSection,
  type EventFormData,
  type MemberOption,
  type SubEventFormData,
  type SubEventFormState,
} from "@/components/admin/events";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (eventData: EventFormData) => Promise<void> | void;
  groupId: bigint | null;
  prefillStartTime?: Date;
  prefillEndTime?: Date;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onSubmit,
  groupId,
  prefillStartTime,
  prefillEndTime,
}: CreateEventDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState<Date | undefined>();
  const [endDateTime, setEndDateTime] = useState<Date | undefined>();
  const [isInternal, setIsInternal] = useState(false);
  const [ifcEventLink, setIfcEventLink] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [subEvents, setSubEvents] = useState<SubEventFormData[]>([]);
  const [expandedSubEvents, setExpandedSubEvents] = useState<number[]>([]);
  const [isAdvancedSubEventsMode, setIsAdvancedSubEventsMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const members = useGroupLeadMembersForGroup(groupId);
  const userTimezone = useUserTimezone();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!open) return;
    if (prefillStartTime) setStartDateTime(new Date(prefillStartTime));
    if (prefillEndTime) setEndDateTime(new Date(prefillEndTime));
  }, [open, prefillStartTime, prefillEndTime]);

  const createDefaultSubEvent = (
    defaultStartDateTime?: Date,
    defaultEndDateTime?: Date
  ): SubEventFormData => {
    const scheduledStartTime = defaultStartDateTime
      ? new Date(defaultStartDateTime)
      : new Date();
    const scheduledEndTime = defaultEndDateTime
      ? new Date(defaultEndDateTime)
      : new Date(scheduledStartTime.getTime() + 2 * 60 * 60 * 1000);

    return {
      subEventType: { tag: "GroupFlight" } as SubEventType,
      name: "",
      description: "",
      scheduledStartTime,
      scheduledEndTime,
      eventLeadHex: "none",
    };
  };

  useEffect(() => {
    if (!open) return;
    setSubEvents((prev) => {
      if (prev.length > 0) return prev;
      return [createDefaultSubEvent(prefillStartTime, prefillEndTime)];
    });
  }, [open, prefillStartTime, prefillEndTime]);

  const clearBanner = () => {
    setSelectedFile(null);
    if (!previewUrl) setBannerUrl("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File size cannot exceed ${maxSize / 1024 / 1024}MB.`);
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAddSubEvent = () => {
    setIsAdvancedSubEventsMode(true);
    const newIndex = subEvents.length;

    const subEventsWithFirstUpdated =
      subEvents.length === 1 && !subEvents[0].name
        ? [
            {
              ...subEvents[0],
              name,
              description,
            },
            ...subEvents.slice(1),
          ]
        : subEvents;

    setSubEvents([...subEventsWithFirstUpdated, createDefaultSubEvent(startDateTime, endDateTime)]);
    setExpandedSubEvents((prev) => {
      const expandedIndices = [...prev, newIndex];
      if (subEvents.length === 1 && !subEvents[0].name) {
        expandedIndices.push(0);
      }
      return expandedIndices;
    });
  };

  const handleRemoveSubEvent = (index: number) => {
    if (subEvents.length <= 1) {
      toast.error("At least one sub-event is required.");
      return;
    }

    setSubEvents(subEvents.filter((_, i) => i !== index));
    setExpandedSubEvents((prev) => prev.filter((i) => i !== index));

    if (subEvents.length - 1 <= 1) {
      setIsAdvancedSubEventsMode(false);
      setExpandedSubEvents([]);
    }
  };

  const handleUpdateSubEvent = (index: number, data: Partial<SubEventFormData>) => {
    setSubEvents(
      subEvents.map((event, i) => (i === index ? { ...event, ...data } : event))
    );
  };

  const handleSetSubEventType = (
    index: number,
    value: "GroupFlight" | "FlyIn" | "FlyOut"
  ) => {
    handleUpdateSubEvent(index, {
      subEventType: { tag: value } as SubEventType,
    });
  };

  const toggleSubEventExpansion = (index: number) => {
    setExpandedSubEvents((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const limitIcaoLength = (icao: string) => icao.slice(0, 4);

  const isIcaoLengthValid = (icao?: string) => {
    if (!icao) return true;
    return icao.trim().length === 4;
  };

  const toDialogSubEventFormState = (subEvent: SubEventFormData): SubEventFormState => {
    const mappedType: SubEventFormState["type"] =
      subEvent.subEventType.tag === "GroupFlight"
        ? "GroupFlight"
        : subEvent.subEventType.tag === "FlyIn"
          ? "FlyIn"
          : "FlyOut";

    return {
      name: subEvent.name,
      description: subEvent.description,
      type: mappedType,
      startTime: subEvent.scheduledStartTime,
      endTime: subEvent.scheduledEndTime,
      hubIcao: subEvent.hubIcao || "",
      departureIcao: subEvent.groupFlightDepartureIcao || "",
      arrivalIcao: subEvent.groupFlightArrivalIcao || "",
      route: subEvent.groupFlightRoute || "",
      notes: subEvent.notes || "",
      eventLeadHex: subEvent.eventLeadHex || "none",
    };
  };

  const fromDialogSubEventFormState = (
    state: SubEventFormState,
    previousSubEvent: SubEventFormData
  ): SubEventFormData => {
    const subEventType: SubEventType = { tag: state.type };

    return {
      ...previousSubEvent,
      subEventType,
      name: state.name,
      description: state.description,
      scheduledStartTime: state.startTime,
      scheduledEndTime: state.endTime,
      hubIcao:
        state.type === "FlyIn" || state.type === "FlyOut"
          ? limitIcaoLength(state.hubIcao)
          : undefined,
      groupFlightDepartureIcao:
        state.type === "GroupFlight" ? limitIcaoLength(state.departureIcao) : undefined,
      groupFlightArrivalIcao:
        state.type === "GroupFlight" ? limitIcaoLength(state.arrivalIcao) : undefined,
      groupFlightRoute: state.type === "GroupFlight" ? state.route : undefined,
      notes: state.notes || undefined,
      eventLeadHex: state.eventLeadHex,
    };
  };

  const updateSubEventFromDialog = (index: number, formState: SubEventFormState) => {
    const previousSubEvent = subEvents[index];
    if (!previousSubEvent) return;
    handleUpdateSubEvent(index, fromDialogSubEventFormState(formState, previousSubEvent));
  };

  const memberOptions: MemberOption[] = members.flatMap((m) => {
    if (!m.user) return [];

    return [
      {
        identityHex: m.user.identity.toHexString(),
        displayName: m.user.displayName || "Unknown User",
        callsignPrefix: m.user.ifcCallsignPrefix || undefined,
      },
    ];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subEvents.length === 0) {
      toast.error("Please add at least one sub-event.");
      return;
    }

    const hasInvalidSubEventTimes = subEvents.some(
      (subEvent) => !subEvent.scheduledStartTime || !subEvent.scheduledEndTime
    );
    if (hasInvalidSubEventTimes) {
      toast.error("Please fill out all required sub-event times.");
      return;
    }

    const hasInvalidIcaoLength = subEvents.some(
      (subEvent) =>
        !isIcaoLengthValid(subEvent.hubIcao) ||
        !isIcaoLengthValid(subEvent.groupFlightDepartureIcao) ||
        !isIcaoLengthValid(subEvent.groupFlightArrivalIcao)
    );
    if (hasInvalidIcaoLength) {
      toast.error("ICAO fields must be exactly 4 characters.");
      return;
    }

    const eventStartTime = new Date(
      Math.min(...subEvents.map((subEvent) => subEvent.scheduledStartTime.getTime()))
    );
    const eventEndTime = new Date(
      Math.max(...subEvents.map((subEvent) => subEvent.scheduledEndTime.getTime()))
    );

    if (isCreating) return;
    setIsCreating(true);

    let finalBannerUrl = bannerUrl;

    if (selectedFile) {
      try {
        setIsUploading(true);
        finalBannerUrl = await uploadImage(selectedFile, name || "Event Banner");
        toast.success("Banner image uploaded successfully!");
      } catch (error: any) {
        toast.error(`Image upload failed: ${error.message}`);
        setIsCreating(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      await onSubmit({
        name,
        description,
        startTime: eventStartTime,
        endTime: eventEndTime,
        isInternal,
        ifcEventLink: ifcEventLink || undefined,
        bannerUrl: finalBannerUrl || undefined,
        subEvents: subEvents.map((event, index) => {
          const leadMember = members.find(
            (m) => m.user?.identity.toHexString() === event.eventLeadHex
          );
          const shouldMirrorMainDetails = !isAdvancedSubEventsMode && index === 0;
          return {
            ...event,
            name: shouldMirrorMainDetails ? name : event.name,
            description: shouldMirrorMainDetails ? description : event.description,
            scheduledStartTime: event.scheduledStartTime,
            scheduledEndTime: event.scheduledEndTime,
            eventLead: leadMember?.user?.identity,
          };
        }),
      });

      setName("");
      setDescription("");
      setStartDateTime(prefillStartTime ? new Date(prefillStartTime) : undefined);
      setEndDateTime(prefillEndTime ? new Date(prefillEndTime) : undefined);
      setIsInternal(false);
      setIfcEventLink("");
      setBannerUrl("");
      setSubEvents([createDefaultSubEvent(prefillStartTime, prefillEndTime)]);
      setExpandedSubEvents([]);
      setIsAdvancedSubEventsMode(false);
      setSelectedFile(null);
      setPreviewUrl(null);

      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-all duration-200 z-[60] ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[50vw] max-h-[90vh] overflow-y-auto z-[60] data-[state=open]:z-[60]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Create your event with one default wave, then add more waves if needed.
            </DialogDescription>
          </DialogHeader>

          <CreateEventProvider
            value={{
              name,
              description,
              startDateTime,
              endDateTime,
              isInternal,
              ifcEventLink,
              bannerUrl,
              selectedFile,
              previewUrl,
              isUploading,
              isCreating,
              subEvents,
              expandedSubEvents,
              isAdvancedSubEventsMode,
              userTimezone,
              memberOptions,
              setName,
              setDescription,
              setStartDateTime,
              setEndDateTime,
              setIsInternal,
              setIfcEventLink,
              setBannerUrl,
              handleFileChange,
              clearBanner,
              handleAddSubEvent,
              handleRemoveSubEvent,
              handleSetSubEventType,
              toggleSubEventExpansion,
              toDialogSubEventFormState,
              fromDialogSubEventFormState,
              updateSubEventFromDialog,
              handleSubmit,
              onOpenChange,
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <CreateEventMainDetailsSection />
              <CreateEventSubEventsSection />
              <CreateEventDialogFooter />
            </form>
          </CreateEventProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}

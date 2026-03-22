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
import { useGroupMembersForGroup } from "@/hooks/spacetimeHooks";
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
  const [isCreating, setIsCreating] = useState(false);

  const members = useGroupMembersForGroup(groupId);
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
    if (prefillStartTime) setStartDateTime(prefillStartTime);
    if (prefillEndTime) setEndDateTime(prefillEndTime);
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
    const newIndex = subEvents.length;
    const defaultStartTime = startDateTime ? new Date(startDateTime) : new Date();
    const defaultEndTime = new Date(defaultStartTime);
    defaultEndTime.setHours(defaultEndTime.getHours() + 2);

    setSubEvents([
      ...subEvents,
      {
        subEventType: { tag: "GroupFlight" } as SubEventType,
        name: "",
        description: "",
        scheduledStartTime: defaultStartTime,
        scheduledEndTime: defaultEndTime,
        eventLeadHex: "none",
      },
    ]);
    setExpandedSubEvents((prev) => [...prev, newIndex]);
  };

  const handleRemoveSubEvent = (index: number) => {
    setSubEvents(subEvents.filter((_, i) => i !== index));
    setExpandedSubEvents((prev) => prev.filter((i) => i !== index));
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
          ? state.hubIcao
          : undefined,
      groupFlightDepartureIcao:
        state.type === "GroupFlight" ? state.departureIcao : undefined,
      groupFlightArrivalIcao:
        state.type === "GroupFlight" ? state.arrivalIcao : undefined,
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
    if (!startDateTime || !endDateTime) {
      toast.error("Please fill out all required fields");
      return;
    }

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
        startTime: startDateTime,
        endTime: endDateTime,
        isInternal,
        ifcEventLink: ifcEventLink || undefined,
        bannerUrl: finalBannerUrl || undefined,
        subEvents: subEvents.map((event) => {
          const leadMember = members.find(
            (m) => m.user?.identity.toHexString() === event.eventLeadHex
          );
          return {
            ...event,
            scheduledStartTime: event.scheduledStartTime,
            scheduledEndTime: event.scheduledEndTime,
            eventLead: leadMember?.user?.identity,
          };
        }),
      });

      setName("");
      setDescription("");
      setStartDateTime(undefined);
      setEndDateTime(undefined);
      setIsInternal(false);
      setIfcEventLink("");
      setBannerUrl("");
      setSubEvents([]);
      setExpandedSubEvents([]);
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
              Create a main event and add sub-events of different types.
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

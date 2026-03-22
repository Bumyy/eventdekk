import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useEvents,
  useSubEvents,
  useGroups,
  useFlightSignups,
  useGroupMembersForGroup,
} from "@/hooks/spacetimeHooks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { SenderError, Timestamp } from "spacetimedb";
import { EventStatus, Event, SubEventType } from "@/module_bindings/types";
import { uploadImage } from "@/api/apiService";
import { useSpacetimeDB } from "spacetimedb/react";
import { useUserTimezone } from "@/utils/timezoneUtils";
import {
  EditEventProvider,
  EventDetailsFormCard,
  InviteGroupsCard,
  ManageOwnFlightsCard,
  SubEventsManagementCard,
  type SubEventFormState,
} from "@/components/admin/events";

export default function EditEvent() {
  const { eventId, groupId } = useParams();
  const currentGroupId = groupId ? BigInt(groupId) : null;
  const navigate = useNavigate();
  const events = useEvents();
  const subEvents = useSubEvents();
  const groups = useGroups();
  const flightSignups = useFlightSignups();
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const userTimezone = useUserTimezone();
  const members = useGroupMembersForGroup(currentGroupId);

  // Event data states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [ifcEventLink, setIfcEventLink] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);

  // Image upload related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // UI states
  const [showAddSubEventDialog, setShowAddSubEventDialog] = useState(false);
  const [showInviteGroupsDialog, setShowInviteGroupsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<
    { id: bigint; name: string }[]
  >([]);

  const initialSubEventForm: SubEventFormState = {
    name: "",
    description: "",
    type: "GroupFlight",
    startTime: new Date(),
    endTime: new Date(),
    hubIcao: "",
    departureIcao: "",
    arrivalIcao: "",
    route: "",
    notes: "",
    eventLeadHex: "none",
  };

  // Sub-event form state
  const [subEventForm, setSubEventForm] =
    useState<SubEventFormState>(initialSubEventForm);

  const [showEditSubEventDialog, setShowEditSubEventDialog] = useState(false);
  const [editingSubEventId, setEditingSubEventId] = useState<bigint | null>(
    null
  );
  const [editSubEventForm, setEditSubEventForm] =
    useState<SubEventFormState>(initialSubEventForm);

  // New state for managing own flights dialog
  const [showManageOwnFlightsDialog, setShowManageOwnFlightsDialog] =
    useState(false);
  const [selectedOwnSubEvents, setSelectedOwnSubEvents] = useState<bigint[]>(
    []
  );
  const [ownFlightDetails, setOwnFlightDetails] = useState<Record<string, any>>(
    {}
  );
  const [isSubmittingFlights, setIsSubmittingFlights] = useState(false);

  // Effect to create/revoke preview URL
  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      // If file is deselected, clear the preview
      setPreviewUrl(null);
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // File validation
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      // Max size (e.g., 5MB)
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

  // Load event data
  useEffect(() => {
    if (!events || !eventId || events.length === 0) return;
    const event = events.find((e: Event) => e.eventId.toString() === eventId);
    if (!event) {
      toast.error("Event not found", {
        description: "The requested event could not be found.",
      });
      navigate(`/admin/events/${groupId}`);
      return;
    }

    setName(event.name);
    setDescription(event.description);
    setStartTime(event.startTime.toDate());
    setEndTime(event.endTime.toDate());
    setIsInternal(event.isInternal);
    setIfcEventLink(event.ifcEventLink || "");
    setBannerUrl(event.bannerUrl || "");
    setEventStatus(event.status);
  }, [events, eventId, navigate]);

  // Get sub events for this event
  const eventSubEvents = subEvents.filter(
    (se) => se.eventId.toString() === eventId
  );

  // Get signups related to this event's sub-events
  const eventSignups = flightSignups.filter((signup) =>
    eventSubEvents.some((subEvent) => subEvent.subEventId === signup.subEventId)
  );

  // Group signups by sub-event
  const signupsBySubEvent = eventSubEvents.reduce(
    (acc, subEvent) => {
      acc[subEvent.subEventId.toString()] = eventSignups.filter(
        (signup) => signup.subEventId === subEvent.subEventId
      );
      return acc;
    },
    {} as Record<string, typeof flightSignups>
  );

  // Load existing own flight signups
  useEffect(() => {
    if (!flightSignups || !eventId || !groupId) return;

    // Find sub-events related to this event
    const thisEventSubEvents = subEvents.filter(
      (se) => se.eventId.toString() === eventId
    );

    // Find signups by this group for this event's sub-events
    const ownSignups = flightSignups.filter(
      (signup) =>
        signup.groupId === BigInt(groupId) &&
        thisEventSubEvents.some((se) => se.subEventId === signup.subEventId)
    );

    // Extract selected sub-events and flight details
    if (ownSignups.length > 0) {
      const signedUpSubEventIds = ownSignups.map((signup) => signup.subEventId);
      setSelectedOwnSubEvents(signedUpSubEventIds);

      // Populate flight details from existing signups
      const detailsMap: Record<string, any> = {};
      ownSignups.forEach((signup) => {
        detailsMap[signup.subEventId.toString()] = {
          callsign: signup.callsign || "",
          aircraftType: signup.aircraftType || "",
          departureTime: signup.desiredDepartureTime
            ? format(signup.desiredDepartureTime.toDate(), "yyyy-MM-dd'T'HH:mm")
            : "",
          arrivalTime: signup.desiredArrivalTime
            ? format(signup.desiredArrivalTime.toDate(), "yyyy-MM-dd'T'HH:mm")
            : "",
          route: signup.routeDetails || "",
          customDepartureIcao: signup.departureIcao || "",
          customArrivalIcao: signup.arrivalIcao || "",
        };
      });
      setOwnFlightDetails(detailsMap);
    }
  }, [flightSignups, subEvents, eventId, groupId]);

  // Handle toggling sub-event selection for own flights
  const handleToggleOwnSubEvent = (subEventId: bigint) => {
    setSelectedOwnSubEvents((prev) => {
      if (prev.some((id) => id === subEventId)) {
        // Remove if already selected
        return prev.filter((id) => id !== subEventId);
      } else {
        // Add if not selected
        return [...prev, subEventId];
      }
    });

    // Initialize flight details for this sub-event if not already done
    const subEvent = subEvents.find((se) => se.subEventId === subEventId);
    if (subEvent) {
      setOwnFlightDetails((prev) => {
        if (!prev[subEventId.toString()]) {
          // Initialize with defaults based on sub-event type
          const details = {
            callsign: "",
            aircraftType: "",
            route: "",
            customDepartureIcao: "",
            customArrivalIcao: "",
          };

          return {
            ...prev,
            [subEventId.toString()]: details,
          };
        }
        return prev;
      });
    }
  };

  // Update flight details for own flights
  const updateOwnFlightDetail = (
    subEventId: string,
    field: string,
    value: string
  ) => {
    setOwnFlightDetails((prev) => ({
      ...prev,
      [subEventId]: {
        ...prev[subEventId],
        [field]: value,
      },
    }));
  };

  // Submit own flight signups
  const handleSubmitOwnFlights = async () => {
    if (!connection || !eventId || !groupId) return;

    setIsSubmittingFlights(true);

    try {
      // Get existing signups for this event by this group
      const thisEventSubEvents = subEvents.filter(
        (se) => se.eventId.toString() === eventId
      );
      const existingSignups = flightSignups.filter(
        (signup) =>
          signup.groupId === BigInt(groupId) &&
          thisEventSubEvents.some((se) => se.subEventId === signup.subEventId)
      );

      // Determine which to add and which to remove
      const subEventsToRemove = existingSignups.filter(
        (signup) => !selectedOwnSubEvents.includes(signup.subEventId)
      );

      // Remove signups that are no longer selected
      for (const signup of subEventsToRemove) {
        try {
          await connection.reducers.deleteFlightSignup({
            signupId: signup.signupId,
          });
        } catch (error) {
          if (error instanceof SenderError) {
            toast.error("Error removing flight signup", {
              description: `${error.message}`,
            });
          } else {
            toast.error("Error removing flight signup", {
              description: "There was a problem removing your flight signup.",
            });
          }
        }
      }

      // Add new signups and update existing ones
      for (const subEventId of selectedOwnSubEvents) {
        const details = ownFlightDetails[subEventId.toString()];
        if (!details) continue;

        // Check if we need to update or add
        const existingSignup = existingSignups.find(
          (signup) => signup.subEventId === subEventId
        );

        // Get the subEvent for type-specific data
        const subEvent = subEvents.find((se) => se.subEventId === subEventId);
        if (!subEvent) continue;

        // Prepare parameters based on sub-event type
        const isGroupFlight = subEvent.subEventType.tag === "GroupFlight";
        const isFlyIn = subEvent.subEventType.tag === "FlyIn";
        const isFlyOut = subEvent.subEventType.tag === "FlyOut";

        // Determine departure and arrival airports based on sub-event type
        let departureIcao = "";
        let arrivalIcao = "";

        if (isGroupFlight) {
          departureIcao = subEvent.groupFlightDepartureIcao || "";
          arrivalIcao = subEvent.groupFlightArrivalIcao || "";
        } else if (isFlyIn) {
          departureIcao = details.customDepartureIcao || "";
          arrivalIcao = subEvent.hubIcao || "";
        } else if (isFlyOut) {
          departureIcao = subEvent.hubIcao || "";
          arrivalIcao = details.customArrivalIcao || "";
        }

        console.log("Departure ICAO:", departureIcao);
        console.log("Arrival ICAO:", arrivalIcao);

        // Parse dates
        let departureTime = null;
        let arrivalTime = null;

        if (details.departureTime) {
          departureTime = Timestamp.fromDate(new Date(details.departureTime));
        }

        if (details.arrivalTime) {
          arrivalTime = Timestamp.fromDate(new Date(details.arrivalTime));
        }

        if (existingSignup) {
          // Update existing signup
          try {
            await connection.reducers.updateFlightSignup({
              signupId: existingSignup.signupId,
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || undefined,
              callsign: details.callsign || null,
              aircraftType: details.aircraftType || null,
              desiredDepartureTime: departureTime || undefined,
              desiredArrivalTime: arrivalTime || undefined,
            });
          } catch (error) {
            if (error instanceof SenderError) {
              toast.error("Error updating flight signup", {
                description: `${error.message}`,
              });
            } else {
              toast.error("Error updating flight signup", {
                description: "There was a problem updating your flight signup.",
              });
            }
          }
        } else {
          // Add new signup
          try {
            await connection.reducers.signupForFlight({
              subEventId: subEventId,
              groupId: BigInt(groupId),
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || undefined,
              callsign: details.callsign || null,
              aircraftType: details.aircraftType || null,
              desiredDepartureTime: departureTime || undefined,
              desiredArrivalTime: arrivalTime || undefined,
            });
          } catch (error) {
            if (error instanceof SenderError) {
              toast.error("Error signing up for flight", {
                description: `${error.message}`,
              });
            } else {
              toast.error("Error signing up for flight", {
                description: "There was a problem signing up for the flight.",
              });
            }
          }
        }
      }

      toast.success("Flight signups updated", {
        description: "Your flight details have been saved successfully.",
      });

      setShowManageOwnFlightsDialog(false);
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error saving flight details", {
          description: `${error.message}`,
        });
      } else {
        console.error("Error submitting flights:", error);
        toast.error("Error saving flight details", {
          description: "There was a problem updating your flight signups.",
        });
      }
    } finally {
      setIsSubmittingFlights(false);
    }
  };

  const handleUpdateEvent = async (publish: boolean = false) => {
    if (!connection || !eventId) return;

    setIsLoading(true);

    // Upload image if a new one is selected
    let finalBannerUrl = bannerUrl;

    if (selectedFile) {
      try {
        setIsUploading(true);
        // Use the API service to upload the image
        finalBannerUrl = await uploadImage(
          selectedFile,
          name || "Event Banner"
        );
        toast.success("Banner image uploaded successfully!");
      } catch (error: unknown) {
        toast.error(`Image upload failed: ${(error as Error).message}`);
        setIsLoading(false);
        return; // Don't proceed if upload fails
      } finally {
        setIsUploading(false);
      }
    }

    // If publishing, set to Published. Otherwise, keep the current status
    const newStatus = publish ? EventStatus.Published : eventStatus;

    try {
      await connection.reducers.updateEvent({
        eventId: BigInt(eventId),
        name: name,
        description: description,
        startTime: startTime ? Timestamp.fromDate(startTime) : null,
        endTime: endTime ? Timestamp.fromDate(endTime) : null,
        ifcEventLink: ifcEventLink || null,
        bannerUrl: finalBannerUrl || null,
        status: newStatus,
        isInternal: isInternal,
      });

      // Update local state with the new banner URL and status
      setBannerUrl(finalBannerUrl);
      setSelectedFile(null);
      setEventStatus(newStatus);

      toast.success(publish ? "Event published!" : "Event saved as draft", {
        description: publish
          ? "Your event is now visible to everyone."
          : "Your changes have been saved as draft.",
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error updating event", {
          description: `${error.message}`,
        });
      }

      console.error("Error updating event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubEvent = async () => {
    if (!connection || !eventId) return;

    let subEventType: SubEventType;
    switch (subEventForm.type) {
      case "GroupFlight":
        subEventType = { tag: "GroupFlight" };
        break;
      case "FlyIn":
        subEventType = { tag: "FlyIn" };
        break;
      case "FlyOut":
        subEventType = { tag: "FlyOut" };
        break;
    }

    try {
      const leadMember = members.find(
        (m) => m.user?.identity.toHexString() === subEventForm.eventLeadHex
      );

      await connection.reducers.addSubEvent({
        eventId: BigInt(eventId),
        name: subEventForm.name,
        description: subEventForm.description,
        subEventType: subEventType,
        scheduledStartTime: Timestamp.fromDate(subEventForm.startTime),
        scheduledEndTime: Timestamp.fromDate(subEventForm.endTime),
        hubIcao:
          subEventForm.type === "FlyIn" || subEventForm.type === "FlyOut"
            ? subEventForm.hubIcao
            : undefined,
        groupFlightDepartureIcao:
          subEventForm.type === "GroupFlight"
            ? subEventForm.departureIcao
            : undefined,
        groupFlightArrivalIcao:
          subEventForm.type === "GroupFlight"
            ? subEventForm.arrivalIcao
            : undefined,
        groupFlightRoute:
          subEventForm.type === "GroupFlight" ? subEventForm.route : undefined,
        notes: subEventForm.notes || undefined,
        eventLead: leadMember?.user?.identity || undefined,
      });

      setShowAddSubEventDialog(false);
      setSubEventForm({ ...initialSubEventForm, startTime: new Date(), endTime: new Date() });

      toast.success("Sub-event added", {
        description: "The sub-event was added successfully.",
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error adding sub-event", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error adding sub-event", {
          description: "There was a problem adding the sub-event.",
        });
      }
      console.error("Error adding sub-event:", error);
    }
  };

  const handleDeleteSubEvent = async (subEventId: bigint) => {
    if (!connection) return;
    if (confirm("Are you sure you want to delete this sub-event?")) {
      try {
        await connection.reducers.deleteSubEvent({ subEventId: subEventId });
        toast.success("Sub-event deleted", {
          description: "The sub-event was deleted successfully.",
        });
      } catch (error) {
        if (error instanceof SenderError) {
          toast.error("Error deleting sub-event", {
            description: `${error.message}`,
          });
        } else {
          toast.error("Error deleting sub-event", {
            description: "There was a problem deleting the sub-event.",
          });
        }
        console.error("Error deleting sub-event:", error);
      }
    }
  };

  const handleEditSubEventClick = (subEvent: {
    subEventType: SubEventType;
    name: string;
    description?: string | null;
    scheduledStartTime: { toDate: () => Date };
    scheduledEndTime: { toDate: () => Date };
    hubIcao?: string | null;
    groupFlightDepartureIcao?: string | null;
    groupFlightArrivalIcao?: string | null;
    groupFlightRoute?: string | null;
    notes?: string | null;
    eventLead?: { toHexString: () => string } | null;
    subEventId: bigint;
  }) => {
    const typeStr = subEvent.subEventType.tag;
    setEditSubEventForm({
      name: subEvent.name,
      description: subEvent.description || "",
      type: typeStr as "GroupFlight" | "FlyIn" | "FlyOut",
      startTime: subEvent.scheduledStartTime.toDate(),
      endTime: subEvent.scheduledEndTime.toDate(),
      hubIcao: subEvent.hubIcao || "",
      departureIcao: subEvent.groupFlightDepartureIcao || "",
      arrivalIcao: subEvent.groupFlightArrivalIcao || "",
      route: subEvent.groupFlightRoute || "",
      notes: subEvent.notes || "",
      eventLeadHex: subEvent.eventLead
        ? subEvent.eventLead.toHexString()
        : "none",
    });
    setEditingSubEventId(subEvent.subEventId);
    setShowEditSubEventDialog(true);
  };

  const handleUpdateSubEvent = async () => {
    if (!connection || !editingSubEventId) return;

    let subEventType: SubEventType;
    switch (editSubEventForm.type) {
      case "GroupFlight":
        subEventType = { tag: "GroupFlight" };
        break;
      case "FlyIn":
        subEventType = { tag: "FlyIn" };
        break;
      case "FlyOut":
        subEventType = { tag: "FlyOut" };
        break;
    }

    const leadMember = members.find(
      (m) => m.user?.identity.toHexString() === editSubEventForm.eventLeadHex
    );

    try {
      await connection.reducers.updateSubEvent({
        subEventId: editingSubEventId,
        name: editSubEventForm.name,
        description: editSubEventForm.description || undefined,
        subEventType: subEventType,
        scheduledStartTime: Timestamp.fromDate(editSubEventForm.startTime),
        scheduledEndTime: Timestamp.fromDate(editSubEventForm.endTime),
        hubIcao:
          editSubEventForm.type === "FlyIn" ||
          editSubEventForm.type === "FlyOut"
            ? editSubEventForm.hubIcao
            : undefined,
        groupFlightDepartureIcao:
          editSubEventForm.type === "GroupFlight"
            ? editSubEventForm.departureIcao
            : undefined,
        groupFlightArrivalIcao:
          editSubEventForm.type === "GroupFlight"
            ? editSubEventForm.arrivalIcao
            : undefined,
        groupFlightRoute:
          editSubEventForm.type === "GroupFlight"
            ? editSubEventForm.route
            : undefined,
        notes: editSubEventForm.notes || undefined,
        eventLead: leadMember?.user?.identity || undefined,
      });

      setShowEditSubEventDialog(false);
      setEditingSubEventId(null);
      toast.success("Sub-event updated successfully!");
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error updating sub-event", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error updating sub-event");
      }
    }
  };

  const handleSelectGroup = (group: { id: bigint; name: string }) => {
    const exists = selectedGroups.some((g) => g.id === group.id);
    if (!exists) {
      setSelectedGroups((prev) => [...prev, group]);
    }
  };

  const handleRemoveGroup = (groupId: bigint) => {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleInviteGroups = async () => {
    if (!connection || !eventId) return;

    const eventIdBigInt = BigInt(eventId);

    try {
      await Promise.all(
        selectedGroups.map((group) =>
          connection.reducers.inviteGroupToEvent({
            eventId: eventIdBigInt,
            invitedGroupId: group.id,
          })
        )
      );

      toast.success("Groups invited", {
        description: `Successfully invited ${selectedGroups.length} group(s) to the event.`,
      });
      setSelectedGroups([]);
      setShowInviteGroupsDialog(false);
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error inviting groups", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error inviting groups", {
          description: "There was a problem inviting groups to the event.",
        });
      }
      console.error("Error inviting groups:", error);
    }
  };

  const memberOptions = members.flatMap((m) => {
    if (!m.user) return [];

    return [
      {
        identityHex: m.user.identity.toHexString(),
        displayName: m.user.displayName || "Unknown User",
        callsignPrefix: m.user.ifcCallsignPrefix || undefined,
      },
    ];
  });

  const clearBanner = () => {
    setSelectedFile(null);
    if (!previewUrl) setBannerUrl("");
  };

  if (!startTime || !endTime) {
    return <div>Loading...</div>;
  }

  return (
    <EditEventProvider
      value={{
        userTimezone,
        name,
        description,
        startTime,
        endTime,
        ifcEventLink,
        isInternal,
        previewUrl,
        bannerUrl,
        selectedFile,
        isUploading,
        isLoading,
        setName,
        setDescription,
        setStartTime,
        setEndTime,
        setIfcEventLink,
        setIsInternal,
        handleFileChange,
        setBannerUrl,
        clearBanner,
        eventSubEvents,
        signupsBySubEvent,
        groups,
        memberOptions,
        showAddSubEventDialog,
        setShowAddSubEventDialog,
        showEditSubEventDialog,
        setShowEditSubEventDialog,
        subEventForm,
        setSubEventForm,
        editSubEventForm,
        setEditSubEventForm,
        handleAddSubEvent,
        handleUpdateSubEvent,
        handleEditSubEventClick,
        handleDeleteSubEvent,
        showInviteGroupsDialog,
        setShowInviteGroupsDialog,
        selectedGroups,
        currentGroupId,
        handleSelectGroup,
        handleRemoveGroup,
        handleInviteGroups,
        showManageOwnFlightsDialog,
        setShowManageOwnFlightsDialog,
        selectedOwnSubEvents,
        ownFlightDetails,
        isSubmittingFlights,
        handleToggleOwnSubEvent,
        updateOwnFlightDetail,
        handleSubmitOwnFlights,
      }}
    >
      <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/events/${groupId}`)}
          >
            Cancel
          </Button>
          {eventStatus?.tag === "Draft" && (
            <Button
              variant="default"
              onClick={() => handleUpdateEvent(true)}
              disabled={isLoading || isUploading}
            >
              {isLoading || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publish Event
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => handleUpdateEvent(false)}
            disabled={isLoading || isUploading}
          >
            {isLoading || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : eventStatus?.tag === "Draft" ? (
              "Save as Draft"
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

        <EventDetailsFormCard />

        <SubEventsManagementCard />

        <InviteGroupsCard />

        <ManageOwnFlightsCard />
      </div>
    </EditEventProvider>
  );
}

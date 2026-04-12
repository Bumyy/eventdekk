import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useEvents,
  useSubEvents,
  useGroups,
  useFlightSignups,
  useGroupLeadMembersForGroup,
  useEventParticipantsForEvent,
  useGroupMemberships,
  useGroupById,
} from "@/hooks/spacetimeHooks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Identity, SenderError, Timestamp } from "spacetimedb";
import { EventStatus, Event, SubEventType, ParticipantRole } from "@/module_bindings/types";
import { uploadImage } from "@/api/apiService";
import { useSpacetimeDB } from "spacetimedb/react";
import { useUserTimezone } from "@/utils/timezoneUtils";
import {
  EditEventProvider,
  EventDetailsFormCard,
  InviteGroupsCard,
  ManageOwnFlightsCard,
  ManageParticipantsCard,
  SubEventsManagementCard,
  type SubEventFormState,
} from "@/components/admin/events";

export default function EditEvent() {
  const { eventId, groupId } = useParams();
  const eventIdBigInt = useMemo(() => (eventId ? BigInt(eventId) : null), [eventId]);
  const currentGroupId = groupId ? BigInt(groupId) : null;
  const navigate = useNavigate();
  const events = useEvents();
  const subEvents = useSubEvents();
  const groups = useGroups();
  const eventParticipants = useEventParticipantsForEvent(eventIdBigInt);
  const flightSignups = useFlightSignups();
  const { getConnection, identity } = useSpacetimeDB();
  const connection = getConnection();
  const userTimezone = useUserTimezone();
  const members = useGroupLeadMembersForGroup(currentGroupId);
  const memberships = useGroupMemberships();
  const currentGroup = useGroupById(currentGroupId);

  const canPublishEvents = useMemo(() => {
    if (!currentGroupId || !identity) return false;

    if (
      currentGroup &&
      currentGroup.ceoIdentity.toHexString() === identity.toHexString()
    ) {
      return true;
    }

    const membership = memberships.find(
      (m) =>
        m.groupId === currentGroupId &&
        m.userIdentity.toHexString() === identity.toHexString()
    );

    return membership?.permissionLevel.tag === "Ceo";
  }, [currentGroupId, identity, currentGroup, memberships]);

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
  const [firstWaveForm, setFirstWaveForm] = useState<SubEventFormState | null>(null);

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
  const [isAdvancedSubEventsMode, setIsAdvancedSubEventsMode] = useState(false);
  const [selectedOwnGroupLeadHex, setSelectedOwnGroupLeadHex] =
    useState<string>("none");

  const limitIcaoLength = (icao: string) => icao.slice(0, 4);

  const isSchemaDeserializeError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || "");
    return message.includes("Can't deserialize") || message.includes("deserialize");
  };

  const signupForFlightCompat = async (payload: any) => {
    try {
      await (connection?.reducers as any).signupForFlight(payload);
    } catch (error) {
      if (!isSchemaDeserializeError(error)) throw error;
      const { liveryId, ...fallbackPayload } = payload;
      await (connection?.reducers as any).signupForFlight(fallbackPayload);
    }
  };

  const updateFlightSignupCompat = async (payload: any) => {
    try {
      await (connection?.reducers as any).updateFlightSignup(payload);
    } catch (error) {
      if (!isSchemaDeserializeError(error)) throw error;
      const { liveryId, ...fallbackPayload } = payload;
      await (connection?.reducers as any).updateFlightSignup(fallbackPayload);
    }
  };

  const isIcaoLengthValid = (icao?: string) => {
    if (!icao) return true;
    return icao.trim().length === 4;
  };

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

  const currentEvent = useMemo(() => {
    if (!events || !eventId) return null;
    return events.find((e: Event) => e.eventId.toString() === eventId) || null;
  }, [events, eventId]);

  const creatorGroupId = currentEvent?.creatorGroupId || null;

  // Get sub events for this event
  const eventSubEvents = useMemo(
    () => subEvents.filter((se) => se.eventId.toString() === eventId),
    [subEvents, eventId]
  );

  // Set isAdvancedSubEventsMode based on sub-events count
  useEffect(() => {
    if (eventSubEvents.length > 1) {
      setIsAdvancedSubEventsMode(true);
    }
  }, [eventSubEvents.length]);

  // Initialize firstWaveForm from first sub-event in simple mode
  useEffect(() => {
    if (eventSubEvents.length > 0 && !isAdvancedSubEventsMode) {
      const firstSubEvent = eventSubEvents[0];
      const formState: SubEventFormState = {
        name: firstSubEvent.name,
        description: firstSubEvent.description || "",
        type: firstSubEvent.subEventType.tag as "GroupFlight" | "FlyIn" | "FlyOut",
        startTime: firstSubEvent.scheduledStartTime.toDate(),
        endTime: firstSubEvent.scheduledEndTime.toDate(),
        hubIcao: firstSubEvent.hubIcao || "",
        departureIcao: firstSubEvent.groupFlightDepartureIcao || "",
        arrivalIcao: firstSubEvent.groupFlightArrivalIcao || "",
        route: firstSubEvent.groupFlightRoute || "",
        notes: firstSubEvent.notes || "",
        eventLeadHex: firstSubEvent.eventLead
          ? firstSubEvent.eventLead.toHexString()
          : "none",
      };
      setFirstWaveForm(formState);
    }
  }, [eventSubEvents, isAdvancedSubEventsMode]);

  // Get signups related to this event's sub-events
  const eventSignups = useMemo(
    () =>
      flightSignups.filter((signup) =>
        eventSubEvents.some((subEvent) => subEvent.subEventId === signup.subEventId)
      ),
    [flightSignups, eventSubEvents]
  );

  // Group signups by sub-event
  const signupsBySubEvent = useMemo(
    () =>
      eventSubEvents.reduce(
        (acc, subEvent) => {
          acc[subEvent.subEventId.toString()] = eventSignups.filter(
            (signup) => signup.subEventId === subEvent.subEventId
          );
          return acc;
        },
        {} as Record<string, typeof flightSignups>
      ),
    [eventSubEvents, eventSignups, flightSignups]
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

      const firstLeadHex = ownSignups.find((signup) => signup.eventLead)?.eventLead?.toHexString();
      setSelectedOwnGroupLeadHex(firstLeadHex || "none");

      // Populate flight details from existing signups
      const detailsMap: Record<string, any> = {};
        ownSignups.forEach((signup) => {
          detailsMap[signup.subEventId.toString()] = {
            eventLeadHex: signup.eventLead
              ? signup.eventLead.toHexString()
              : "none",
            callsign: signup.callsign || "",
            aircraftType: signup.aircraftType || "",
            liveryId: signup.liveryId || "",
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
            eventLeadHex: "none",
            callsign: "",
            aircraftType: "",
            liveryId: "",
            route: "",
            customDepartureIcao: "",
            customArrivalIcao: "",
            departureTime: format(subEvent.scheduledStartTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
            arrivalTime: format(subEvent.scheduledEndTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
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

    const hasMissingCallsign = selectedOwnSubEvents.some((subEventId) => {
      const details = ownFlightDetails[subEventId.toString()];
      return !details?.callsign || details.callsign.trim().length === 0;
    });

    if (hasMissingCallsign) {
      toast.error("Callsign is required for all selected sub-events.");
      return;
    }

    const hasInvalidIcaoLength = selectedOwnSubEvents.some((subEventId) => {
      const subEvent = subEvents.find((se) => se.subEventId === subEventId);
      const details = ownFlightDetails[subEventId.toString()];
      if (!subEvent || !details) return false;

      if (subEvent.subEventType.tag === "FlyIn") {
        return !isIcaoLengthValid(details.customDepartureIcao);
      }

      if (subEvent.subEventType.tag === "FlyOut") {
        return !isIcaoLengthValid(details.customArrivalIcao);
      }

      return false;
    });

    if (hasInvalidIcaoLength) {
      toast.error("ICAO fields must be exactly 4 characters.");
      return;
    }

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
        const selectedEventLead =
          selectedOwnGroupLeadHex !== "none"
            ? Identity.fromString(selectedOwnGroupLeadHex)
            : null;

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
          departureIcao = limitIcaoLength(subEvent.groupFlightDepartureIcao || "");
          arrivalIcao = limitIcaoLength(subEvent.groupFlightArrivalIcao || "");
        } else if (isFlyIn) {
          departureIcao = limitIcaoLength(details.customDepartureIcao || "");
          arrivalIcao = limitIcaoLength(subEvent.hubIcao || "");
        } else if (isFlyOut) {
          departureIcao = limitIcaoLength(subEvent.hubIcao || "");
          arrivalIcao = limitIcaoLength(details.customArrivalIcao || "");
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
            await updateFlightSignupCompat({
              signupId: existingSignup.signupId,
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || undefined,
              callsign: details.callsign || null,
              aircraftType: details.aircraftType || null,
              liveryId: details.liveryId || null,
              eventLead: selectedEventLead,
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
            await signupForFlightCompat({
              subEventId: subEventId,
              groupId: BigInt(groupId),
              eventLead: selectedEventLead,
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || undefined,
              callsign: details.callsign || null,
              aircraftType: details.aircraftType || null,
              liveryId: details.liveryId || null,
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

    if (publish && !canPublishEvents) {
      toast.error("Only Admins can publish events");
      return;
    }

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

    // Calculate event times from sub-events
    let eventStartTime = startTime;
    let eventEndTime = endTime;
    
    if (eventSubEvents.length > 0) {
      const minStartTime = new Date(
        Math.min(...eventSubEvents.map(se => se.scheduledStartTime.toDate().getTime()))
      );
      const maxEndTime = new Date(
        Math.max(...eventSubEvents.map(se => se.scheduledEndTime.toDate().getTime()))
      );
      eventStartTime = minStartTime;
      eventEndTime = maxEndTime;
    }

    // If publishing, set to Published. Otherwise, keep the current status
    const newStatus = publish ? EventStatus.Published : eventStatus;

    try {
      await connection.reducers.updateEvent({
        eventId: BigInt(eventId),
        name: name,
        description: description,
        startTime: eventStartTime ? Timestamp.fromDate(eventStartTime) : null,
        endTime: eventEndTime ? Timestamp.fromDate(eventEndTime) : null,
        ifcEventLink: ifcEventLink || null,
        bannerUrl: finalBannerUrl || null,
        status: newStatus,
        isInternal: isInternal,
      });

      // If in simple mode (single sub-event), update the sub-event too
      if (!isAdvancedSubEventsMode && eventSubEvents.length === 1 && firstWaveForm) {
        await updateFirstSubEventFromForm(firstWaveForm);
      }

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

const handleAddSubEvent = async (formOverride?: SubEventFormState) => {
    if (!connection || !eventId) return;

    const formData = formOverride ?? subEventForm;

    const hasInvalidIcaoLength =
      !isIcaoLengthValid(formData.hubIcao) ||
      !isIcaoLengthValid(formData.departureIcao) ||
      !isIcaoLengthValid(formData.arrivalIcao);
    if (hasInvalidIcaoLength) {
      toast.error("ICAO fields must be exactly 4 characters.");
      return;
    }

    let subEventType: SubEventType;
    switch (formData.type) {
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

    setIsAdvancedSubEventsMode(true);

    try {
      const leadMember = members.find(
        (m) => m.user?.identity.toHexString() === formData.eventLeadHex
      );

      await connection.reducers.addSubEvent({
        eventId: BigInt(eventId),
        name: formData.name,
        description: formData.description,
        subEventType: subEventType,
        scheduledStartTime: Timestamp.fromDate(formData.startTime),
        scheduledEndTime: Timestamp.fromDate(formData.endTime),
        hubIcao:
          formData.type === "FlyIn" || formData.type === "FlyOut"
            ? limitIcaoLength(formData.hubIcao)
            : undefined,
        groupFlightDepartureIcao:
          formData.type === "GroupFlight"
            ? limitIcaoLength(formData.departureIcao)
            : undefined,
        groupFlightArrivalIcao:
          formData.type === "GroupFlight"
            ? limitIcaoLength(formData.arrivalIcao)
            : undefined,
        groupFlightRoute:
          formData.type === "GroupFlight" ? formData.route : undefined,
        notes: formData.notes || undefined,
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

const handleDeleteSubEvent = useCallback(async (subEventId: bigint) => {
    if (!connection) return;
    if (confirm("Are you sure you want to delete this sub-event?")) {
      try {
        await connection.reducers.deleteSubEvent({ subEventId: subEventId });
        if (eventSubEvents.length - 1 <= 1) {
          setIsAdvancedSubEventsMode(false);
        }
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
  }, [connection, eventSubEvents.length]);

const handleEditSubEventClick = useCallback((subEvent: {
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
  }, []);

  const toSubEventFormState = useCallback((subEvent: {
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
  }): SubEventFormState => {
    const typeStr = subEvent.subEventType.tag;
    return {
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
    };
  }, []);

  const updateFirstSubEventFromForm = useCallback(async (formState: SubEventFormState) => {
    if (!connection || !eventId || eventSubEvents.length === 0) return;

    const hasInvalidIcaoLength =
      !isIcaoLengthValid(formState.hubIcao) ||
      !isIcaoLengthValid(formState.departureIcao) ||
      !isIcaoLengthValid(formState.arrivalIcao);
    if (hasInvalidIcaoLength) {
      toast.error("ICAO fields must be exactly 4 characters.");
      return;
    }
    
    const firstSubEvent = eventSubEvents[0];
    
    let subEventType: SubEventType;
    switch (formState.type) {
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
      (m) => m.user?.identity.toHexString() === formState.eventLeadHex
    );

    try {
      await connection.reducers.updateSubEvent({
        subEventId: firstSubEvent.subEventId,
        name: name,
        description: description,
        subEventType: subEventType,
        scheduledStartTime: Timestamp.fromDate(formState.startTime),
        scheduledEndTime: Timestamp.fromDate(formState.endTime),
        hubIcao:
          formState.type === "FlyIn" ||
          formState.type === "FlyOut"
            ? limitIcaoLength(formState.hubIcao)
            : undefined,
        groupFlightDepartureIcao:
          formState.type === "GroupFlight"
            ? limitIcaoLength(formState.departureIcao)
            : undefined,
        groupFlightArrivalIcao:
          formState.type === "GroupFlight"
            ? limitIcaoLength(formState.arrivalIcao)
            : undefined,
        groupFlightRoute:
          formState.type === "GroupFlight"
            ? formState.route
            : undefined,
        notes: formState.notes || undefined,
        eventLead: leadMember?.user?.identity || undefined,
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error updating wave", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error updating wave");
      }
    }
  }, [connection, eventId, eventSubEvents, members, name, description]);

  const handleUpdateSubEvent = async (formOverride?: SubEventFormState) => {
    if (!connection || !editingSubEventId) return;

    const formData = formOverride ?? editSubEventForm;

    const hasInvalidIcaoLength =
      !isIcaoLengthValid(formData.hubIcao) ||
      !isIcaoLengthValid(formData.departureIcao) ||
      !isIcaoLengthValid(formData.arrivalIcao);
    if (hasInvalidIcaoLength) {
      toast.error("ICAO fields must be exactly 4 characters.");
      return;
    }

    let subEventType: SubEventType;
    switch (formData.type) {
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
      (m) => m.user?.identity.toHexString() === formData.eventLeadHex
    );

    try {
      await connection.reducers.updateSubEvent({
        subEventId: editingSubEventId,
        name: formData.name,
        description: formData.description || undefined,
        subEventType: subEventType,
        scheduledStartTime: Timestamp.fromDate(formData.startTime),
        scheduledEndTime: Timestamp.fromDate(formData.endTime),
        hubIcao:
          formData.type === "FlyIn" ||
          formData.type === "FlyOut"
            ? limitIcaoLength(formData.hubIcao)
            : undefined,
        groupFlightDepartureIcao:
          formData.type === "GroupFlight"
            ? limitIcaoLength(formData.departureIcao)
            : undefined,
        groupFlightArrivalIcao:
          formData.type === "GroupFlight"
            ? limitIcaoLength(formData.arrivalIcao)
            : undefined,
        groupFlightRoute:
          formData.type === "GroupFlight"
            ? formData.route
            : undefined,
        notes: formData.notes || undefined,
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

  const memberOptions = useMemo(
    () =>
      members.flatMap((m) => {
        if (!m.user) return [];

        return [
          {
            identityHex: m.user.identity.toHexString(),
            displayName: m.user.displayName || "Unknown User",
            callsignPrefix: m.user.ifcCallsignPrefix || undefined,
          },
        ];
      }),
    [members]
  );

const availableInviteGroups = useMemo(() => {
    const invitedGroupIds = new Set(eventParticipants.map((participant) => participant.groupId));

    return groups.filter(
      (group) =>
        group.groupId !== currentGroupId && !invitedGroupIds.has(group.groupId)
    );
  }, [groups, currentGroupId, eventParticipants]);

  const hosts = useMemo(
    () =>
      eventParticipants.filter(
        (p) => p.role.tag === "Host" && p.status.tag === "Accepted"
      ),
    [eventParticipants]
  );

  const participants = useMemo(
    () =>
      eventParticipants.filter((p) => p.role.tag === "Participant"),
    [eventParticipants]
  );

  const handleAddCohost = async (groupId: bigint) => {
    if (!connection || !eventId) return;

    try {
      await connection.reducers.addCohostToEvent({
        eventId: BigInt(eventId),
        groupId: groupId,
      });
      toast.success("Co-host added", {
        description: "The group has been added as a co-host.",
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error adding co-host", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error adding co-host", {
          description: "There was a problem adding the co-host.",
        });
      }
      console.error("Error adding co-host:", error);
    }
  };

  const handleRemoveParticipant = async (groupId: bigint) => {
    if (!connection || !eventId) return;

    if (!confirm("Are you sure you want to remove this group from the event?")) {
      return;
    }

    try {
      await connection.reducers.removeParticipantFromEvent({
        eventId: BigInt(eventId),
        groupId: groupId,
      });
      toast.success("Participant removed", {
        description: "The group has been removed from the event.",
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error removing participant", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error removing participant", {
          description: "There was a problem removing the participant.",
        });
      }
      console.error("Error removing participant:", error);
    }
  };

  const handleUpdateParticipantRole = async (
    groupId: bigint,
    newRole: "Host" | "Participant"
  ) => {
    if (!connection || !eventId) return;

    const role: ParticipantRole =
      newRole === "Host" ? { tag: "Host" } : { tag: "Participant" };

    try {
      await connection.reducers.updateParticipantRole({
        eventId: BigInt(eventId),
        groupId: groupId,
        newRole: role,
      });
      toast.success("Role updated", {
        description: `The group role has been updated to ${newRole}.`,
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error updating role", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error updating role", {
          description: "There was a problem updating the role.",
        });
      }
      console.error("Error updating role:", error);
    }
  };

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
        isAdvancedSubEventsMode,
        setName,
        setDescription,
        setStartTime,
        setEndTime,
        setIfcEventLink,
        setIsInternal,
        handleFileChange,
        setBannerUrl,
        clearBanner,
        setIsAdvancedSubEventsMode,
        eventSubEvents,
        signupsBySubEvent,
        groups,
        availableInviteGroups,
        memberOptions,
        selectedOwnGroupLeadHex,
        setSelectedOwnGroupLeadHex,
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
        toSubEventFormState,
        updateFirstSubEventFromForm,
        firstWaveForm,
        setFirstWaveForm,
        showInviteGroupsDialog,
        setShowInviteGroupsDialog,
        selectedGroups,
        currentGroupId,
        creatorGroupId,
        handleSelectGroup,
        handleRemoveGroup,
        handleInviteGroups,
        eventParticipants,
        hosts,
        participants,
        handleAddCohost,
        handleRemoveParticipant,
        handleUpdateParticipantRole,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/events/${groupId}`)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          {eventStatus?.tag === "Draft" && canPublishEvents && (
            <Button
              variant="default"
              onClick={() => handleUpdateEvent(true)}
              disabled={isLoading || isUploading}
              className="w-full sm:w-auto"
            >
              {isLoading || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publish
                </>
              ) : "Publish"}
            </Button>
          )}
          <Button
            onClick={() => handleUpdateEvent(false)}
            disabled={isLoading || isUploading}
            className="w-full sm:w-auto"
          >
            {isLoading || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Save
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

        <EventDetailsFormCard />

        <SubEventsManagementCard />

<InviteGroupsCard />

        <ManageParticipantsCard />

        <ManageOwnFlightsCard />
      </div>
    </EditEventProvider>
  );
}

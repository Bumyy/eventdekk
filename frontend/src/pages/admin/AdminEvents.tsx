import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  useEvents,
  useSubEventsForGroup,
  useSubEventsForEvents,
  useFlightSignupsForGroup,
  useGroups,
  useUpcomingHostedEvents,
  useUpcomingAttendingEvents,
  usePastHostedEvents,
  usePendingEventInvitations,
  useSubEvents,
  useCurrentUser,
  useUsers,
  useGroupAvailabilityData,
  useGroupMemberships,
  useGroupById,
} from "@/hooks/spacetimeHooks";
import { useUserTimezone } from "@/utils/timezoneUtils";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { SubEventType, EventStatus, Event } from "@/module_bindings/types";
import { useParams, useNavigate } from "react-router-dom";
import { Identity, Timestamp, SenderError } from "spacetimedb";
import { useSpacetimeDB } from "spacetimedb/react";
import { toast } from "sonner";
import { EventInvitationDialog } from "@/components/EventInvitationDialog";
import EventDialog from "@/components/EventDialog";
import { format } from "date-fns";
import {
  UpcomingEventsSection,
  EventInvitationsSection,
  PastEventsSection,
} from "@/components/admin/events";

export default function AdminEvents() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const { getConnection, identity } = useSpacetimeDB();
  const connection = getConnection();
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;
  const userTimezone = useUserTimezone();
  const navigate = useNavigate();
  const [prefillStartTime, setPrefillStartTime] = useState<Date | undefined>();
  const [prefillEndTime, setPrefillEndTime] = useState<Date | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillStart = params.get("prefillStart");
    const prefillEnd = params.get("prefillEnd");

    if (!prefillStart || !prefillEnd) return;

    const parsedStart = new Date(prefillStart);
    const parsedEnd = new Date(prefillEnd);

    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime())
    ) {
      return;
    }

    setPrefillStartTime(parsedStart);
    setPrefillEndTime(parsedEnd);
    setShowCreateDialog(true);

    params.delete("prefillStart");
    params.delete("prefillEnd");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  // Use filtered hooks for better performance
  const subEvents = useSubEventsForGroup(groupIdBigInt);
  const events = useEvents();
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  const flightSignups = useFlightSignupsForGroup(groupIdBigInt);
  // TODO: make this more efficient
  const groups = useGroups();
  const currentUser = useCurrentUser();
  const users = useUsers();
  const memberships = useGroupMemberships();
  const currentGroup = useGroupById(groupIdBigInt);

  // Use the new filtered hooks
  const upcomingEvents = useUpcomingHostedEvents(groupIdBigInt);
  const upcomingAttendingEvents = useUpcomingAttendingEvents(groupIdBigInt);
  const pastEvents = usePastHostedEvents(groupIdBigInt);
  const pendingInvitations = usePendingEventInvitations(groupIdBigInt);
  console.log(pendingInvitations);

  // Get group's availability data for conflict checking
  const groupAvailabilityData = useGroupAvailabilityData(groupIdBigInt);

  console.log(upcomingAttendingEvents, upcomingEvents, groupIdBigInt);

  // Get sub-events for pending invitation events (not hosted by this group)
  const invitationEventIds = useMemo(() => {
    return pendingInvitations?.map((e) => e.eventId) || [];
  }, [pendingInvitations]);
  const relevantEventIds = useMemo(() => {
    const invitedIds = pendingInvitations?.map((e) => e.eventId) || [];
    const attendingIds = upcomingAttendingEvents?.map((e) => e.eventId) || [];

    // Combine and remove any duplicates
    return Array.from(new Set([...invitedIds, ...attendingIds]));
  }, [pendingInvitations, upcomingAttendingEvents]);

  const relevantSubEvents = useSubEventsForEvents(relevantEventIds);

  const canPublishEvents = useMemo(() => {
    if (!groupIdBigInt || !identity) return false;

    if (
      currentGroup &&
      currentGroup.ceoIdentity.toHexString() === identity.toHexString()
    ) {
      return true;
    }

    const membership = memberships.find(
      (m) =>
        m.groupId === groupIdBigInt &&
        m.userIdentity.toHexString() === identity.toHexString()
    );

    return membership?.permissionLevel.tag === "Ceo";
  }, [groupIdBigInt, identity, memberships, currentGroup]);

  const invitationSubEvents = useSubEventsForEvents(invitationEventIds);
  console.log(invitationEventIds);
  const allSubEvents = useSubEvents();
  console.log(allSubEvents);

  // Response dialog states
  const [selectedInvitation, setSelectedInvitation] = useState<any | null>(
    null
  );
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  // State for event management dialog
  const [selectedEventForManagement, setSelectedEventForManagement] = useState<
    any | null
  >(null);
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [preSelectedSubEvents, setPreSelectedSubEvents] = useState<bigint[]>(
    []
  );
  const [preFilledFlightDetails, setPreFilledFlightDetails] = useState<
    Record<string, any>
  >({});

  const isSchemaDeserializeError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error || "");
    return (
      message.includes("Can't deserialize") || message.includes("deserialize")
    );
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

  const respondToEventInvitationCompat = async (payload: {
    eventId: bigint;
    groupId: bigint;
    response: { tag: "Accepted" | "Declined" | "Pending" };
  }) => {
    const procedures = (connection as any)?.procedures;
    if (procedures?.respondToEventInvitationAndNotify) {
      await procedures.respondToEventInvitationAndNotify(payload);
      return;
    }

    await connection?.reducers.respondToEventInvitation(payload);
  };

  const handleCreateEvent = async (eventData: {
    name: string;
    description: string;
    startTime: Date;
    endTime: Date;
    isInternal: boolean;
    ifcEventLink?: string;
    bannerUrl?: string;
    subEvents: {
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
      eventLead?: any;
    }[];
  }) => {
    if (!connection) {
      console.error("No connection available");
      return;
    }

    try {
      const beforeEventIds = new Set(
        eventsRef.current
          .filter((e) => e.creatorGroupId === groupIdBigInt)
          .map((e) => e.eventId.toString())
      );

      // Transform sub-events data
      const subEventsData = eventData.subEvents.map((subEvent) => ({
        name: subEvent.name,
        description: subEvent.description,
        subEventType: subEvent.subEventType,
        scheduledStartTime: Timestamp.fromDate(subEvent.scheduledStartTime),
        scheduledEndTime: Timestamp.fromDate(subEvent.scheduledEndTime),
        hubIcao: subEvent.hubIcao,
        groupFlightDepartureIcao: subEvent.groupFlightDepartureIcao,
        groupFlightArrivalIcao: subEvent.groupFlightArrivalIcao,
        groupFlightRoute: subEvent.groupFlightRoute,
        notes: subEvent.notes,
        eventLead: subEvent.eventLead,
      }));

      // Create event with sub-events as Draft
      await connection.reducers.createEvent({
        creatorGroupId: BigInt(groupId ?? "0"),
        name: eventData.name,
        description: eventData.description,
        startTime: Timestamp.fromDate(eventData.startTime),
        endTime: Timestamp.fromDate(eventData.endTime),
        isInternal: eventData.isInternal,
        ifcEventLink: eventData.ifcEventLink,
        bannerUrl: eventData.bannerUrl,
        subEventsData: subEventsData,
        status: { tag: "Draft" } as EventStatus,
      });

      setShowCreateDialog(false);
      toast.success("Event created successfully!");

      const maxAttempts = 40;
      const pollDelayMs = 150;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollDelayMs));

        const createdEvent = eventsRef.current
          .filter((e) => e.creatorGroupId === groupIdBigInt)
          .find((e) => !beforeEventIds.has(e.eventId.toString()));

        if (createdEvent) {
          navigate(
            `/admin/groups/${groupId}/events/${createdEvent.eventId}/edit`
          );
          return;
        }
      }

      const fallbackEvent = eventsRef.current
        .filter((e) => e.creatorGroupId === groupIdBigInt)
        .sort(
          (a, b) =>
            b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        )
        .find((e) => !beforeEventIds.has(e.eventId.toString()));

      if (fallbackEvent) {
        navigate(
          `/admin/groups/${groupId}/events/${fallbackEvent.eventId}/edit`
        );
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event. Please try again.");
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleManageEvent = (eventId: bigint) => {
    navigate(`/admin/groups/${groupId}/events/${eventId}/edit`);
  };

  const handleManageParticipation = (event: Event) => {
    const invitationData = {
      eventId: event.eventId,
      groupId: groupIdBigInt,
      participationId: BigInt(0),
      status: { tag: "Accepted" },
    };

    const eventSubEvents = relevantSubEvents.filter(
      (se) => se.eventId === event.eventId
    );

    const relevantSignups =
      flightSignups?.filter(
        (signup) =>
          signup.groupId === groupIdBigInt &&
          eventSubEvents.some((se) => se.subEventId === signup.subEventId)
      ) || [];

    const signedUpSubEventIds = relevantSignups.map(
      (signup) => signup.subEventId
    );

    const flightDetailsFromSignups: Record<string, any> = {};

    relevantSignups.forEach((signup) => {
      flightDetailsFromSignups[signup.subEventId.toString()] = {
        eventLeadHex: signup.eventLead
          ? signup.eventLead.toHexString()
          : "none",
        callsign: signup.callsign || "",
        aircraftType: signup.aircraftType || "",
        liveryId: signup.liveryId || "",
        route: signup.routeDetails || "",
        departureTime: signup.desiredDepartureTime
          ? format(signup.desiredDepartureTime.toDate(), "yyyy-MM-dd'T'HH:mm")
          : "",
        arrivalTime: signup.desiredArrivalTime
          ? format(signup.desiredArrivalTime.toDate(), "yyyy-MM-dd'T'HH:mm")
          : "",
        customDepartureIcao: signup.departureIcao || "",
        customArrivalIcao: signup.arrivalIcao || "",
      };
    });

    setPreSelectedSubEvents(signedUpSubEventIds);
    setPreFilledFlightDetails(flightDetailsFromSignups);
    setSelectedEventForManagement(invitationData);
    setShowManagementDialog(true);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  // Reset pre-selections when dialog closes
  useEffect(() => {
    if (!showManagementDialog) {
      setPreSelectedSubEvents([]);
      setPreFilledFlightDetails({});
    }
  }, [showManagementDialog]);

  const handleDeleteEvent = (eventId: bigint) => {
    if (!connection) return;
    if (confirm("Are you sure you want to delete this event?")) {
      connection.reducers.deleteEvent({
        eventId: eventId,
      });
      toast.success("Event deleted successfully!");
    }
  };

  const handlePublishEvent = (eventId: bigint) => {
    if (!connection) return;
    if (!canPublishEvents) {
      toast.error("Only Admins can publish events");
      return;
    }

    // Find the current event data to preserve all other fields
    const currentEvent = upcomingEvents?.find((e) => e.eventId === eventId);
    if (!currentEvent) {
      toast.error("Could not find the event to publish");
      return;
    }

    connection.reducers.updateEvent({
      eventId: eventId,
      name: currentEvent.name,
      description: currentEvent.description,
      startTime: currentEvent.startTime,
      endTime: currentEvent.endTime,
      isInternal: currentEvent.isInternal,
      ifcEventLink: currentEvent.ifcEventLink || null,
      bannerUrl: currentEvent.bannerUrl || null,
      status: { tag: "Published" } as EventStatus,
    });
    toast.success("Event published successfully!");
  };

  const handleOpenResponseDialog = (event: Event) => {
    // Create invitation object with the required structure for the dialog
    const invitation = {
      eventId: event.eventId,
      groupId: groupIdBigInt,
      participationId: BigInt(0),
      status: { tag: "Pending" },
    };
    setSelectedInvitation(invitation);
    setShowResponseDialog(true);
  };

  const handleAcceptInvitation = async (
    invitation: any,
    selectedSubEvents: bigint[],
    flightDetails: Record<
      string,
      {
        eventLeadHex?: string;
        callsign?: string;
        aircraftType?: string;
        liveryId?: string;
        departureTime?: string;
        arrivalTime?: string;
        route?: string;
        customDepartureIcao?: string;
        customArrivalIcao?: string;
      }
    >
  ) => {
    if (!connection) return;

    let successCount = 0;
    let failureCount = 0;

    // Show initial loading toast
    const toastId = toast.loading(`Processing invitation...`);

    try {
      // Step 1: Respond to the invitation - using direct await
      await respondToEventInvitationCompat({
        eventId: invitation.eventId,
        groupId: invitation.groupId,
        response: { tag: "Accepted" },
      });

      toast.loading(`Processing flight signups...`, {
        id: toastId,
      });

      // Process sub-events one by one for better error handling
      for (const subEventId of selectedSubEvents) {
        const subEvent = relevantSubEvents.find(
          (se) => se.subEventId === subEventId
        );
        if (!subEvent) {
          failureCount++;
          continue;
        }

        const details = flightDetails[subEventId.toString()] || {};
        const selectedEventLead =
          details.eventLeadHex && details.eventLeadHex !== "none"
            ? Identity.fromString(details.eventLeadHex)
            : null;

        // Determine departure and arrival based on sub-event type
        let departureIcao = "";
        let arrivalIcao = "";

        // Set airports based on sub-event type with custom options for FlyIn/FlyOut
        if (subEvent.subEventType.tag === "GroupFlight") {
          departureIcao = subEvent.groupFlightDepartureIcao || "";
          arrivalIcao = subEvent.groupFlightArrivalIcao || "";
        } else if (subEvent.subEventType.tag === "FlyIn") {
          arrivalIcao = subEvent.hubIcao || "";
          departureIcao = details.customDepartureIcao || "";
        } else if (subEvent.subEventType.tag === "FlyOut") {
          departureIcao = subEvent.hubIcao || "";
          arrivalIcao = details.customArrivalIcao || "";
        }

        // Convert time strings to timestamps if provided
        const departureTime = details.departureTime
          ? Timestamp.fromDate(new Date(details.departureTime))
          : undefined;

        const arrivalTime = details.arrivalTime
          ? Timestamp.fromDate(new Date(details.arrivalTime))
          : undefined;

        try {
          // Create flight signup using direct await
          await signupForFlightCompat({
            subEventId: subEventId,
            groupId: groupIdBigInt!,
            eventLead: selectedEventLead,
            departureIcao: departureIcao,
            arrivalIcao: arrivalIcao,
            routeDetails: details.route || "",
            callsign: details.callsign,
            aircraftType: details.aircraftType,
            liveryId: details.liveryId,
            desiredDepartureTime: departureTime,
            desiredArrivalTime: arrivalTime,
          });
          successCount++;
        } catch (error) {
          failureCount++;
          if (error instanceof SenderError) {
            toast.error(`Failed to sign up for ${subEvent.name}`, {
              description: error.message,
            });
          } else {
            console.error(
              `Error signing up for sub-event ${subEvent.name}:`,
              error
            );
          }
        }
      }

      // Update the final toast based on the results
      if (failureCount === 0) {
        toast.success("Invitation accepted successfully", {
          id: toastId,
          description: `Signed up for ${successCount} sub-event${
            successCount !== 1 ? "s" : ""
          }.`,
        });
      } else if (successCount > 0) {
        toast.warning("Invitation partially accepted", {
          id: toastId,
          description: `Signed up for ${successCount} of ${selectedSubEvents.length} sub-events. Some signups failed.`,
        });
      } else {
        toast.error("Failed to accept invitation", {
          id: toastId,
          description:
            "Could not sign up for any sub-events, but invitation was accepted.",
        });
      }

      setShowResponseDialog(false);
    } catch (error) {
      console.error("Error responding to invitation:", error);
      if (error instanceof SenderError) {
        toast.error("Failed to respond to invitation", {
          description: error.message,
        });
      } else {
        toast.error("Failed to process your response");
      }
    }
  };

  const handleDeclineInvitation = async (invitation: any) => {
    if (!connection) return;

    const toastId = toast.loading("Declining invitation...");

    try {
      await respondToEventInvitationCompat({
        eventId: invitation.eventId,
        groupId: invitation.groupId,
        response: { tag: "Declined" },
      });

      toast.success("Invitation declined successfully", { id: toastId });
      setShowResponseDialog(false);
    } catch (error) {
      console.error("Error declining invitation:", error);
      if (error instanceof SenderError) {
        toast.error("Failed to decline invitation", {
          description: error.message,
          id: toastId,
        });
      } else {
        toast.error("Failed to decline invitation.", { id: toastId });
      }
    }
  };

  const handleUpdateParticipation = async (
    invitation: any,
    selectedSubEvents: bigint[],
    flightDetails: Record<
      string,
      {
        callsign?: string;
        aircraftType?: string;
        liveryId?: string;
        departureTime?: string;
        arrivalTime?: string;
        route?: string;
        customDepartureIcao?: string;
        customArrivalIcao?: string;
      }
    >
  ) => {
    if (!connection) return;

    try {
      // Show initial loading toast
      const toastId = toast.loading(`Updating event participation...`);

      // Get the current signups for this event
      const eventSubEvents = relevantSubEvents.filter(
        (se) => se.eventId === invitation.eventId
      );
      const currentSignups =
        flightSignups?.filter(
          (signup) =>
            signup.groupId === groupIdBigInt &&
            eventSubEvents.some((se) => se.subEventId === signup.subEventId)
        ) || [];

      // Track operations for better feedback
      let updatedCount = 0;
      let addedCount = 0;
      let removedCount = 0;
      let failedCount = 0;

      // Step 1: Find signups to delete (those not in selectedSubEvents)
      const signupsToDelete = currentSignups.filter(
        (signup) => !selectedSubEvents.some((id) => id === signup.subEventId)
      );

      // Step 2: Process deletions
      for (const signup of signupsToDelete) {
        try {
          await connection.reducers.deleteFlightSignup({
            signupId: signup.signupId,
          });
          removedCount++;
        } catch (error) {
          failedCount++;
          if (error instanceof SenderError) {
            toast.error("Failed to delete signup", {
              description: error.message,
            });
          }
          console.error(`Error deleting flight signup:`, error);
        }
      }

      // Step 3: Process updates and additions
      for (const subEventId of selectedSubEvents) {
        const subEvent = relevantSubEvents.find(
          (se) => se.subEventId === subEventId
        );
        if (!subEvent) continue;
        const details = flightDetails[subEventId.toString()] || {};
        const selectedEventLead =
          details.eventLeadHex && details.eventLeadHex !== "none"
            ? Identity.fromString(details.eventLeadHex)
            : null;

        // Determine departure and arrival based on sub-event type
        let departureIcao = "";
        let arrivalIcao = "";

        // Set airports based on sub-event type with custom options for FlyIn/FlyOut
        if (subEvent.subEventType.tag === "GroupFlight") {
          departureIcao = subEvent.groupFlightDepartureIcao || "";
          arrivalIcao = subEvent.groupFlightArrivalIcao || "";
        } else if (subEvent.subEventType.tag === "FlyIn") {
          arrivalIcao = subEvent.hubIcao || "";
          departureIcao = details.customDepartureIcao || "";
        } else if (subEvent.subEventType.tag === "FlyOut") {
          departureIcao = subEvent.hubIcao || "";
          arrivalIcao = details.customArrivalIcao || "";
        }

        // Convert time strings to timestamps if provided
        const departureTime = details.departureTime
          ? Timestamp.fromDate(new Date(details.departureTime))
          : undefined;

        const arrivalTime = details.arrivalTime
          ? Timestamp.fromDate(new Date(details.arrivalTime))
          : undefined;

        // Check if there's an existing signup for this sub-event
        const existingSignup = currentSignups.find(
          (signup) => signup.subEventId === subEventId
        );

        try {
          if (existingSignup) {
            // Update existing signup - using direct await
            await updateFlightSignupCompat({
              signupId: existingSignup.signupId,
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || "",
              callsign: details.callsign,
              aircraftType: details.aircraftType,
              liveryId: details.liveryId,
              eventLead: selectedEventLead,
              desiredDepartureTime: departureTime,
              desiredArrivalTime: arrivalTime,
            });
            updatedCount++;
          } else {
            // Create new signup - using direct await
            await signupForFlightCompat({
              subEventId: subEventId,
              groupId: groupIdBigInt!,
              eventLead: selectedEventLead,
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || "",
              callsign: details.callsign,
              aircraftType: details.aircraftType,
              liveryId: details.liveryId,
              desiredDepartureTime: departureTime,
              desiredArrivalTime: arrivalTime,
            });
            addedCount++;
          }
        } catch (error) {
          failedCount++;
          if (error instanceof SenderError) {
            toast.error(
              `Failed to ${existingSignup ? "update" : "create"} signup for ${subEvent.name}`,
              {
                description: error.message,
              }
            );
          }
          console.error(
            `Error updating flight signup for ${subEvent.name}:`,
            error
          );
        }
      }

      // Update the toast based on results
      const totalChanged = updatedCount + addedCount + removedCount;

      if (failedCount === 0) {
        toast.success("Participation updated successfully", {
          id: toastId,
          description: `${updatedCount} updated, ${addedCount} added, and ${removedCount} removed.`,
        });
      } else if (totalChanged > 0) {
        toast.warning("Participation partially updated", {
          id: toastId,
          description: `${totalChanged} changes succeeded, but ${failedCount} operations failed.`,
        });
      } else {
        toast.error("Failed to update participation", {
          id: toastId,
        });
      }

      setShowManagementDialog(false);
    } catch (error) {
      console.error("Error updating participation:", error);
      toast.error("Failed to update participation");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create New Event
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <div className="w-full overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <TabsList className="w-max min-w-full sm:w-fit sm:min-w-0">
            <TabsTrigger value="upcoming" className="px-2 sm:px-3">
              Upcoming Events
            </TabsTrigger>
            <TabsTrigger value="invitations" className="px-2 sm:px-3">
              Event Invitations{" "}
              {pendingInvitations?.length > 0 && (
                <Badge className="ml-1 sm:ml-2" variant="destructive">
                  {pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="px-2 sm:px-3">
              Past Events
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upcoming">
          <UpcomingEventsSection
            upcomingEvents={upcomingEvents || []}
            upcomingAttendingEvents={upcomingAttendingEvents || []}
            subEvents={[...subEvents, ...(relevantSubEvents || [])]}
            flightSignups={flightSignups || []}
            groups={groups || []}
            userTimezone={userTimezone}
            groupId={groupIdBigInt || BigInt(0)}
            expandedEvents={expandedEvents}
            onToggleExpand={toggleEventExpansion}
            onManageEvent={handleManageEvent}
            onDeleteEvent={handleDeleteEvent}
            onManageParticipation={handleManageParticipation}
            onPublishEvent={handlePublishEvent}
            canPublishEvents={canPublishEvents}
            currentUser={currentUser}
            users={users || []}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="invitations">
          <EventInvitationsSection
            pendingInvitations={pendingInvitations || []}
            subEvents={invitationSubEvents || []}
            userTimezone={userTimezone}
            groups={groups || []}
            availabilityData={groupAvailabilityData}
            onRespond={handleOpenResponseDialog}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="past">
          <PastEventsSection
            pastEvents={pastEvents || []}
            subEvents={[...subEvents]}
            userTimezone={userTimezone}
            onEventClick={handleEventClick}
          />
        </TabsContent>
      </Tabs>

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateEvent}
        groupId={groupIdBigInt}
        prefillStartTime={prefillStartTime}
        prefillEndTime={prefillEndTime}
      />

      {/* Event invitation dialog for new invitations */}
      <EventInvitationDialog
        open={showResponseDialog}
        onOpenChange={setShowResponseDialog}
        invitation={selectedInvitation}
        events={[]}
        subEvents={relevantSubEvents}
        groupId={groupIdBigInt || BigInt(0)}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        availabilityData={groupAvailabilityData}
      />

      {/* Event management dialog for existing participations */}
      <EventInvitationDialog
        open={showManagementDialog}
        onOpenChange={setShowManagementDialog}
        invitation={selectedEventForManagement}
        events={[]}
        subEvents={relevantSubEvents}
        groupId={groupIdBigInt || BigInt(0)}
        onAccept={handleUpdateParticipation}
        onDecline={async () => setShowManagementDialog(false)}
        preSelectedSubEvents={preSelectedSubEvents}
        preFilledFlightDetails={preFilledFlightDetails}
        availabilityData={groupAvailabilityData}
        currentEventId={selectedEventForManagement?.eventId}
      />

      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
        />
      )}
    </div>
  );
}

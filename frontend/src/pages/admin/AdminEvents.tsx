import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plane,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
} from "lucide-react";
import { useSpacetime } from "@/components/SpacetimeProvider";
import {
  useEvents,
  useSubEvents,
  useEventParticipants,
  useFlightSignups,
  useGroups,
} from "@/hooks/spacetimeHooks";
import { format } from "date-fns";
import { EventTypeDialog } from "@/components/EventTypeDialog";
import { SubEventType } from "@/module_bindings/sub_event_type_type";
import { Timestamp } from "@clockworklabs/spacetimedb-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { EventStatus } from "@/module_bindings/event_status_type";
import { toast } from "sonner";
import { EventInvitationDialog } from "@/components/EventInvitationDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminEvents() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const { connection } = useSpacetime();
  const events = useEvents(connection);
  const subEvents = useSubEvents(connection);
  const eventParticipants = useEventParticipants(connection);
  const flightSignups = useFlightSignups(connection);
  const groups = useGroups(connection);
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;
  const navigate = useNavigate();

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

  // Filter and sort events
  const upcomingEvents = events
    ?.filter((event) => event.creatorGroupId === groupIdBigInt)
    .filter((event) => event.endTime.toDate() > new Date()) // Use endTime here
    .sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    );

  // Filter events the group is attending (but not created by this group)
  const upcomingAttendingEvents = events
    ?.filter((event) => event.creatorGroupId !== groupIdBigInt)
    .filter((event) => event.endTime.toDate() > new Date()) // Use endTime here
    .filter((event) => {
      const participation = eventParticipants?.find(
        (p) =>
          p.eventId === event.eventId &&
          p.groupId === groupIdBigInt &&
          p.status.tag === "Accepted"
      );
      return participation !== undefined;
    })
    .sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    );

  const pastEvents = events
    ?.filter((event) => event.creatorGroupId === groupIdBigInt)
    .filter((event) => event.endTime.toDate() <= new Date()) // Use endTime here
    .sort(
      (a, b) => b.startTime.toDate().getTime() - a.startTime.toDate().getTime()
    );

  // Filter invitations for this group
  const pendingInvitations = eventParticipants
    ?.filter((participant) => participant.groupId === groupIdBigInt)
    .filter((participant) => participant.status.tag === "Pending")
    .sort((a, b) => {
      const eventA = events?.find((e) => e.eventId === a.eventId);
      const eventB = events?.find((e) => e.eventId === b.eventId);
      return (
        (eventA?.startTime?.toDate().getTime() ?? 0) -
        (eventB?.startTime?.toDate().getTime() ?? 0)
      );
    });

  const handleCreateEvent = async (eventData: {
    name: string;
    description: string;
    startTime: Date;
    endTime: Date;
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
    }[];
  }) => {
    if (!connection) {
      console.error("No connection available");
      return;
    }

    try {
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
      }));

      // Create event with sub-events
      connection.reducers.createEvent(
        BigInt(groupId ?? "0"),
        eventData.name,
        eventData.description,
        Timestamp.fromDate(eventData.startTime),
        Timestamp.fromDate(eventData.endTime),
        eventData.ifcEventLink,
        eventData.bannerUrl,
        subEventsData
      );

      setShowCreateDialog(false);
      toast.success("Event created successfully!");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event. Please try again.");
    }
  };

  const getEventTypeBadge = (type: SubEventType) => {
    switch (type.tag) {
      case "GroupFlight":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Plane className="h-3 w-3" />
            Group Flight
          </Badge>
        );
      case "FlyIn":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Fly-in
          </Badge>
        );
      case "FlyOut":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Plane className="h-3 w-3" />
            Fly-out
          </Badge>
        );
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

  const handleManageParticipation = (event: any) => {
    // Find the participant record for this event and group
    const participation = eventParticipants?.find(
      (p) => p.eventId === event.eventId && p.groupId === groupIdBigInt
    );

    if (participation) {
      // Create a synthetic invitation object that matches the structure expected by the dialog
      const invitationData = {
        eventId: event.eventId,
        groupId: groupIdBigInt,
        participationId: participation.participationId,
        status: participation.status,
      };

      // Get all sub-events for this event
      const eventSubEvents = subEvents.filter(
        (se) => se.eventId === event.eventId
      );

      // Get all flight signups for this group and event's sub-events
      const relevantSignups =
        flightSignups?.filter(
          (signup) =>
            signup.groupId === groupIdBigInt &&
            eventSubEvents.some((se) => se.subEventId === signup.subEventId)
        ) || [];

      // Create an array of subEventIds that the group is signed up for
      const signedUpSubEventIds = relevantSignups.map(
        (signup) => signup.subEventId
      );

      // Prepare flight details from existing signups
      const flightDetailsFromSignups: Record<string, any> = {};

      relevantSignups.forEach((signup) => {
        flightDetailsFromSignups[signup.subEventId.toString()] = {
          callsign: signup.callsign || "",
          aircraftType: signup.aircraftType || "",
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

      // Set pre-selected data
      setPreSelectedSubEvents(signedUpSubEventIds);
      setPreFilledFlightDetails(flightDetailsFromSignups);
      setSelectedEventForManagement(invitationData);
      setShowManagementDialog(true);
    } else {
      toast.error("Cannot find participation record for this event");
    }
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
      connection.reducers.updateEvent(
        eventId,
        null, // name (null means don't update)
        null, // description
        null, // startTime
        null, // endTime
        null, // ifcEventLink
        null, // bannerUrl
        { tag: "Cancelled" } as EventStatus // Set status to cancelled
      );
      toast.success("Event deleted successfully!");
    }
  };

  const handleOpenResponseDialog = (invitation: any) => {
    setSelectedInvitation(invitation);
    setShowResponseDialog(true);
  };

  const handleAcceptInvitation = async (
    invitation: any,
    selectedSubEvents: bigint[],
    flightDetails: Record<
      string,
      {
        callsign?: string;
        aircraftType?: string;
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
      // Calculate total operations (1 invitation response + 1 per sub-event)
      const totalOps = 1 + selectedSubEvents.length;
      let successCount = 0;
      let failureCount = 0;

      // Show initial loading toast
      const toastId = toast.loading(`Processing invitation...`);

      // Step 1: Respond to the invitation with a promise wrapper for callback
      await new Promise<void>((resolve, reject) => {
        const callbackId = connection.reducers.onRespondToEventInvitation(
          (ctx, eventId, groupId, response) => {
            console.log(ctx, eventId, groupId, response);
            // Clean up the callback after we get a response
            connection.reducers.removeOnRespondToEventInvitation(callbackId);

            if (ctx.event.status.tag === "Failed") {
              reject(
                new Error(
                  `Failed to respond to invitation: ${ctx.event.status.value}`
                )
              );
            } else {
              toast.loading(`Processing flight signups...`, {
                id: toastId,
              });
              resolve();
            }
          }
        );

        // Invoke the reducer
        connection.reducers.respondToEventInvitation(
          invitation.eventId,
          invitation.groupId,
          { tag: "Accepted" }
        );
      });

      // Process sub-events one by one for better error handling
      for (let i = 0; i < selectedSubEvents.length; i++) {
        const subEventId = selectedSubEvents[i];
        const subEvent = subEvents.find((se) => se.subEventId === subEventId);
        if (!subEvent) {
          failureCount++;
          continue;
        }

        const details = flightDetails[subEventId.toString()] || {};

        // Determine departure and arrival based on sub-event type
        let departureIcao = "";
        let arrivalIcao = "";

        // Set airports based on sub-event type with custom options for FlyIn/FlyOut
        if (subEvent.subEventType.tag === "GroupFlight") {
          // For group flights, use the fixed departure and arrival airports
          departureIcao = subEvent.groupFlightDepartureIcao || "";
          arrivalIcao = subEvent.groupFlightArrivalIcao || "";
        } else if (subEvent.subEventType.tag === "FlyIn") {
          // For fly-in, arrival is fixed to hub but departure can be custom
          arrivalIcao = subEvent.hubIcao || "";
          departureIcao = details.customDepartureIcao || ""; // Use custom departure ICAO
        } else if (subEvent.subEventType.tag === "FlyOut") {
          // For fly-out, departure is fixed to hub but arrival can be custom
          departureIcao = subEvent.hubIcao || "";
          arrivalIcao = details.customArrivalIcao || ""; // Use custom arrival ICAO
        }

        // Convert time strings to timestamps if provided
        const departureTime = details.departureTime
          ? Timestamp.fromDate(new Date(details.departureTime))
          : undefined;

        const arrivalTime = details.arrivalTime
          ? Timestamp.fromDate(new Date(details.arrivalTime))
          : undefined;

        try {
          // Create a promise wrapper for each signup
          await new Promise<void>((resolve, reject) => {
            const signupCallbackId = connection.reducers.onSignupForFlight(
              (ctx) => {
                // Clean up the callback after we get a response
                connection.reducers.removeOnSignupForFlight(signupCallbackId);

                if (ctx.event.status.tag === "Failed") {
                  failureCount++;
                  reject(
                    new Error(
                      `Failed to sign up for ${subEvent.name}: ${ctx.event.status.value}`
                    )
                  );
                } else {
                  successCount++;
                  resolve();
                }
              }
            );

            // Create flight signup with route details included
            connection.reducers.signupForFlight(
              subEventId,
              groupIdBigInt!,
              departureIcao,
              arrivalIcao,
              details.route || "", // Include the route details
              details.callsign,
              details.aircraftType,
              departureTime,
              arrivalTime
            );
          });
        } catch (error) {
          console.error(
            `Error signing up for sub-event ${subEvent.name}:`,
            error
          );
          // Continue with other sub-events even if one fails
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
      toast.error("Failed to process your response", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const handleDeclineInvitation = async (invitation: any) => {
    if (!connection) return;

    try {
      const toastId = toast.loading("Declining invitation...");

      await new Promise<void>((resolve, reject) => {
        const callbackId = connection.reducers.onRespondToEventInvitation(
          (ctx, result, error) => {
            connection.reducers.removeOnRespondToEventInvitation(callbackId);

            if (error) {
              reject(new Error(`Failed to decline: ${error.message}`));
            } else {
              resolve();
            }
          }
        );

        connection.reducers.respondToEventInvitation(
          invitation.eventId,
          invitation.participationId,
          { tag: "Declined" }
        );
      });

      toast.success("Invitation declined successfully", { id: toastId });
      setShowResponseDialog(false);
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation.");
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
      const eventSubEvents = subEvents.filter(
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
          await new Promise<void>((resolve, reject) => {
            const callbackId = connection.reducers.onDeleteFlightSignup(
              (ctx) => {
                connection.reducers.removeOnDeleteFlightSignup(callbackId);

                if (ctx.event.status.tag === "Failed") {
                  failedCount++;
                  reject(
                    new Error(
                      `Failed to delete signup: ${ctx.event.status.value}`
                    )
                  );
                } else {
                  removedCount++;
                  resolve();
                }
              }
            );

            connection.reducers.deleteFlightSignup(signup.signupId);
          });
        } catch (error) {
          console.error(`Error deleting flight signup:`, error);
        }
      }

      // Step 3: Process updates and additions
      for (const subEventId of selectedSubEvents) {
        const subEvent = subEvents.find((se) => se.subEventId === subEventId);
        if (!subEvent) continue;

        const details = flightDetails[subEventId.toString()] || {};

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
            // Update existing signup
            await new Promise<void>((resolve, reject) => {
              const callbackId = connection.reducers.onUpdateFlightSignup(
                (ctx) => {
                  connection.reducers.removeOnUpdateFlightSignup(callbackId);

                  if (ctx.event.status.tag === "Failed") {
                    failedCount++;
                    reject(
                      new Error(
                        `Failed to update signup: ${ctx.event.status.value}`
                      )
                    );
                  } else {
                    updatedCount++;
                    resolve();
                  }
                }
              );

              connection.reducers.updateFlightSignup(
                existingSignup.signupId,
                departureIcao,
                arrivalIcao,
                details.route || "",
                details.callsign,
                details.aircraftType,
                departureTime,
                arrivalTime
              );
            });
          } else {
            // Create new signup
            await new Promise<void>((resolve, reject) => {
              const callbackId = connection.reducers.onSignupForFlight(
                (ctx) => {
                  connection.reducers.removeOnSignupForFlight(callbackId);

                  if (ctx.event.status.tag === "Failed") {
                    failedCount++;
                    reject(
                      new Error(
                        `Failed to create signup: ${ctx.event.status.value}`
                      )
                    );
                  } else {
                    addedCount++;
                    resolve();
                  }
                }
              );

              // Create flight signup
              connection.reducers.signupForFlight(
                subEventId,
                groupIdBigInt!,
                departureIcao,
                arrivalIcao,
                details.route || "",
                details.callsign,
                details.aircraftType,
                departureTime,
                arrivalTime
              );
            });
          }
        } catch (error) {
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

  // Get event details for an invitation
  const getEventDetails = (invitation: any) => {
    if (!events) return null;
    return events.find((e) => e.eventId === invitation.eventId);
  };

  // Helper function to get group information
  const getGroupInfo = (groupId: bigint) => {
    const group = groups?.find((g) => g.groupId === groupId);
    return {
      name: group?.name || "Unknown Group",
      logo: group?.logoUrl || "",
      tag: group?.tag || "",
    };
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
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="invitations">
            Event Invitations{" "}
            {pendingInvitations?.length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents && upcomingEvents.length > 0 && (
            <>
              <h2 className="text-xl font-medium mt-4">
                Events You're Hosting
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {upcomingEvents.map((event) => {
                  const eventSubEvents = subEvents.filter(
                    (se) => se.eventId === event.eventId
                  );
                  return (
                    <Card key={event.eventId} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">
                              {event.name}
                            </h2>
                            <Badge variant="outline">
                              {eventSubEvents.length} Sub-events
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(event.startTime.toDate(), "MMMM d, yyyy")}
                            </span>
                            <span>•</span>
                            <span>
                              {format(event.startTime.toDate(), "h:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleEventExpansion(event.eventId.toString())
                            }
                          >
                            {expandedEvents.includes(
                              event.eventId.toString()
                            ) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleManageEvent(event.eventId)}
                          >
                            Manage
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteEvent(event.eventId)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {expandedEvents.includes(event.eventId.toString()) && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg font-semibold">Sub Events</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {eventSubEvents.map((subEvent) => (
                              <Card key={subEvent.subEventId} className="p-4">
                                <div className="mb-2">
                                  {getEventTypeBadge(subEvent.subEventType)}
                                </div>
                                <h4 className="font-medium">{subEvent.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {subEvent.description}
                                </p>
                                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>
                                    {format(
                                      subEvent.scheduledStartTime.toDate(),
                                      "MMMM d, yyyy"
                                    )}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {format(
                                      subEvent.scheduledStartTime.toDate(),
                                      "h:mm a"
                                    )}
                                  </span>
                                  {subEvent.subEventType.tag ===
                                    "GroupFlight" &&
                                    subEvent.groupFlightDepartureIcao &&
                                    subEvent.groupFlightArrivalIcao && (
                                      <>
                                        <span>•</span>
                                        <span>
                                          {subEvent.groupFlightDepartureIcao} →{" "}
                                          {subEvent.groupFlightArrivalIcao}
                                        </span>
                                      </>
                                    )}
                                  {subEvent.subEventType.tag === "FlyIn" &&
                                    subEvent.hubIcao && (
                                      <>
                                        <span>•</span>
                                        <span>To: {subEvent.hubIcao}</span>
                                      </>
                                    )}
                                  {subEvent.subEventType.tag === "FlyOut" &&
                                    subEvent.hubIcao && (
                                      <>
                                        <span>•</span>
                                        <span>From: {subEvent.hubIcao}</span>
                                      </>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    Manage
                                  </Button>
                                  <Button variant="destructive" size="sm">
                                    Delete
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {upcomingAttendingEvents && upcomingAttendingEvents.length > 0 && (
            <>
              <h2 className="text-xl font-medium mt-6">
                Events You're Attending
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {upcomingAttendingEvents.map((event) => {
                  const eventSubEvents = subEvents.filter(
                    (se) => se.eventId === event.eventId
                  );

                  // Find all sub-events this group is participating in by counting flight signups
                  const participatingSubEventIds =
                    flightSignups
                      ?.filter(
                        (signup) =>
                          signup.groupId === groupIdBigInt &&
                          eventSubEvents.some(
                            (se) => se.subEventId === signup.subEventId
                          )
                      )
                      .map((signup) => signup.subEventId) || [];

                  // Remove duplicates to get accurate count
                  const uniqueParticipatingIds = [
                    ...new Set(participatingSubEventIds),
                  ];
                  const participatingCount = uniqueParticipatingIds.length;

                  // Get creator group info
                  const creatorGroupInfo = getGroupInfo(event.creatorGroupId);

                  return (
                    <Card key={event.eventId} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">
                              {event.name}
                            </h2>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Users className="h-3 w-3" />
                              Attending
                            </Badge>
                            <Badge variant="secondary">
                              {participatingCount} of {eventSubEvents.length}{" "}
                              sub-events
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(event.startTime.toDate(), "MMMM d, yyyy")}
                            </span>
                            <span>•</span>
                            <span>
                              {format(event.startTime.toDate(), "h:mm a")}
                            </span>
                            <span>•</span>
                            <div className="flex items-center gap-2">
                              <span>Hosted by:</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage
                                  src={creatorGroupInfo.logo}
                                  alt={creatorGroupInfo.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {creatorGroupInfo.tag ||
                                    creatorGroupInfo.name.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{creatorGroupInfo.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleEventExpansion(
                                `attending-${event.eventId.toString()}`
                              )
                            }
                          >
                            {expandedEvents.includes(
                              `attending-${event.eventId.toString()}`
                            ) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleManageParticipation(event)}
                          >
                            Manage Participation
                          </Button>
                        </div>
                      </div>

                      {expandedEvents.includes(
                        `attending-${event.eventId.toString()}`
                      ) && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg font-semibold">Sub Events</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {eventSubEvents.map((subEvent) => {
                              // Check if this group has a flight signup for this sub-event
                              const isParticipating =
                                flightSignups?.some(
                                  (signup) =>
                                    signup.groupId === groupIdBigInt &&
                                    signup.subEventId === subEvent.subEventId
                                ) || false;

                              return (
                                <Card
                                  key={subEvent.subEventId}
                                  className={`p-4 ${
                                    isParticipating
                                      ? "border-2 border-primary"
                                      : ""
                                  }`}
                                >
                                  <div className="mb-2 flex items-center justify-between">
                                    {getEventTypeBadge(subEvent.subEventType)}
                                    {isParticipating && (
                                      <Badge variant="secondary">
                                        Registered
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-medium">
                                    {subEvent.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {subEvent.description}
                                  </p>
                                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>
                                      {format(
                                        subEvent.scheduledStartTime.toDate(),
                                        "MMMM d, yyyy"
                                      )}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {format(
                                        subEvent.scheduledStartTime.toDate(),
                                        "h:mm a"
                                      )}
                                    </span>
                                    {subEvent.subEventType.tag ===
                                      "GroupFlight" &&
                                      subEvent.groupFlightDepartureIcao &&
                                      subEvent.groupFlightArrivalIcao && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            {subEvent.groupFlightDepartureIcao}{" "}
                                            → {subEvent.groupFlightArrivalIcao}
                                          </span>
                                        </>
                                      )}
                                    {subEvent.subEventType.tag === "FlyIn" &&
                                      subEvent.hubIcao && (
                                        <>
                                          <span>•</span>
                                          <span>To: {subEvent.hubIcao}</span>
                                        </>
                                      )}
                                    {subEvent.subEventType.tag === "FlyOut" &&
                                      subEvent.hubIcao && (
                                        <>
                                          <span>•</span>
                                          <span>From: {subEvent.hubIcao}</span>
                                        </>
                                      )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {(!upcomingEvents || upcomingEvents.length === 0) &&
            (!upcomingAttendingEvents ||
              upcomingAttendingEvents.length === 0) && (
              <p className="text-muted-foreground">No upcoming events found.</p>
            )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {pendingInvitations?.length > 0 ? (
              pendingInvitations.map((invitation) => {
                const event = getEventDetails(invitation);
                if (!event) return null;

                return (
                  <Card
                    key={invitation.participationId.toString()}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">{event.name}</h2>
                        <p className="text-muted-foreground">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {format(event.startTime.toDate(), "MMMM d, yyyy")}
                          </span>
                          <span>•</span>
                          <span>
                            {format(event.startTime.toDate(), "h:mm a")}
                          </span>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {
                              subEvents.filter(
                                (se) => se.eventId === event.eventId
                              ).length
                            }{" "}
                            sub-events
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenResponseDialog(invitation)}
                        >
                          Respond
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <p className="text-muted-foreground">No pending invitations.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {pastEvents.map((event) => {
              const eventSubEvents = subEvents.filter(
                (se) => se.eventId === event.eventId
              );
              return (
                <Card key={event.eventId} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">{event.name}</h2>
                        <Badge variant="outline">
                          {eventSubEvents.length} Sub-events
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {format(event.startTime.toDate(), "MMMM d, yyyy")}
                        </span>
                        <span>•</span>
                        <span>
                          {format(event.startTime.toDate(), "h:mm a")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">View Details</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <EventTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateEvent}
      />

      {/* Event invitation dialog for new invitations */}
      <EventInvitationDialog
        open={showResponseDialog}
        onOpenChange={setShowResponseDialog}
        invitation={selectedInvitation}
        events={events || []}
        subEvents={subEvents}
        groupId={groupIdBigInt || BigInt(0)}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
      />

      {/* Event management dialog for existing participations */}
      <EventInvitationDialog
        open={showManagementDialog}
        onOpenChange={setShowManagementDialog}
        invitation={selectedEventForManagement}
        events={events || []}
        subEvents={subEvents}
        groupId={groupIdBigInt || BigInt(0)}
        onAccept={handleUpdateParticipation} // Use the new function here
        onDecline={() => setShowManagementDialog(false)} // Just close dialog for now
        preSelectedSubEvents={preSelectedSubEvents}
        preFilledFlightDetails={preFilledFlightDetails}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  MapPin,
  Plane,
} from "lucide-react";
import { Infer } from "spacetimedb";
import { SubEventType, Event, SubEvent } from "@/module_bindings";

type SubEventType = Infer<typeof SubEventType>;
type Event = Infer<typeof Event>;
type SubEvent = Infer<typeof SubEvent>;

interface FlightDetails {
  callsign?: string;
  aircraftType?: string;
  departureTime?: string;
  arrivalTime?: string;
  route?: string;
  customDepartureIcao?: string; // Added for custom departure
  customArrivalIcao?: string; // Added for custom arrival
}

interface EventInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: any | null;
  events: Event[];
  subEvents: SubEvent[];
  groupId: bigint;
  onAccept: (
    invitation: any,
    selectedSubEvents: bigint[],
    flightDetails: Record<string, FlightDetails>
  ) => Promise<void>;
  onDecline: (invitation: any) => Promise<void>;
  preSelectedSubEvents?: bigint[];
  preFilledFlightDetails?: Record<string, FlightDetails>;
}

export function EventInvitationDialog({
  open,
  onOpenChange,
  invitation,
  events,
  subEvents,
  onAccept,
  onDecline,
  preSelectedSubEvents = [],
  preFilledFlightDetails = {},
}: EventInvitationDialogProps) {
  // State for selected sub-events and flight details
  const [selectedSubEvents, setSelectedSubEvents] = useState<bigint[]>([]);
  const [flightDetails, setFlightDetails] = useState<
    Record<string, FlightDetails>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationsCompleted, setOperationsCompleted] = useState(0);
  const [totalOperations, setTotalOperations] = useState(0);

  // Reset state when dialog opens with a new invitation or the invitation itself changes
  useEffect(() => {
    // This effect runs when the dialog opens or the specific invitation changes.
    // It initializes the internal state based on the props passed at that moment.
    if (open && invitation) {
      // Determine initial state based on props available when opening/changing
      const initialSelected =
        preSelectedSubEvents.length > 0 ? preSelectedSubEvents : [];
      const initialDetails =
        preSelectedSubEvents.length > 0 ? preFilledFlightDetails : {};

      setSelectedSubEvents(initialSelected);
      setFlightDetails(initialDetails);
      setIsProcessing(false); // Reset processing state
      setOperationsCompleted(0);
      setTotalOperations(0);
    }
    // Depend only on `open` and `invitation`. Assumes parent provides correct props
    // before `open` becomes true or `invitation` changes.
  }, [open, invitation]); // Updated dependencies

  // Get event details for an invitation
  const getEvent = () => {
    if (!invitation || !events) return null;
    return events.find((e) => e.eventId === invitation.eventId);
  };

  // Get sub-events for an event
  const getEventSubEvents = () => {
    if (!invitation) return [];
    return subEvents.filter((se) => se.eventId === invitation.eventId);
  };

  const handleToggleSubEvent = (subEventId: bigint) => {
    setSelectedSubEvents((prev) => {
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
      setFlightDetails((prev) => {
        if (!prev[subEventId.toString()]) {
          // Initialize with defaults based on sub-event type
          const details: FlightDetails = {
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

  const updateFlightDetail = (
    subEventId: string,
    field: keyof FlightDetails,
    value: string
  ) => {
    setFlightDetails((prev) => ({
      ...prev,
      [subEventId]: {
        ...prev[subEventId],
        [field]: value,
      },
    }));
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    try {
      setIsProcessing(true);
      await onAccept(invitation, selectedSubEvents, flightDetails);
    } catch (error) {
      console.error("Error in dialog accept handler:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation) return;

    try {
      setIsProcessing(true);
      await onDecline(invitation);
    } catch (error) {
      console.error("Error in dialog decline handler:", error);
    } finally {
      setIsProcessing(false);
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

  const event = getEvent();
  const isManagingExisting = preSelectedSubEvents.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isManagingExisting
              ? "Manage Event Participation"
              : "Respond to Event Invitation"}
          </DialogTitle>
          <DialogDescription>
            {event?.name || "Event Invitation"}
          </DialogDescription>
        </DialogHeader>

        {invitation && (
          <ScrollArea className="pr-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  Select Sub-Events to Join
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose which sub-events you want to participate in and provide
                  the necessary flight details.
                </p>
              </div>

              {getEventSubEvents().map((subEvent) => {
                const isSelected = selectedSubEvents.some(
                  (id) => id === subEvent.subEventId
                );
                const isGroupFlight =
                  subEvent.subEventType.tag === "GroupFlight";
                const isFlyIn = subEvent.subEventType.tag === "FlyIn";
                const isFlyOut = subEvent.subEventType.tag === "FlyOut";

                return (
                  <Card key={subEvent.subEventId.toString()} className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`subevent-${subEvent.subEventId}`}
                        checked={isSelected}
                        onCheckedChange={() =>
                          handleToggleSubEvent(subEvent.subEventId)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <label
                            htmlFor={`subevent-${subEvent.subEventId}`}
                            className="font-medium cursor-pointer"
                          >
                            {subEvent.name}
                          </label>
                          {getEventTypeBadge(subEvent.subEventType)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {subEvent.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(
                              subEvent.scheduledStartTime.toDate(),
                              "PPP"
                            )}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(subEvent.scheduledStartTime.toDate(), "p")}
                          </span>

                          {isGroupFlight && (
                            <span>
                              {subEvent.groupFlightDepartureIcao} →{" "}
                              {subEvent.groupFlightArrivalIcao}
                            </span>
                          )}

                          {isFlyIn && subEvent.hubIcao && (
                            <span>Destination: {subEvent.hubIcao}</span>
                          )}

                          {isFlyOut && subEvent.hubIcao && (
                            <span>Departure: {subEvent.hubIcao}</span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            <h4 className="text-sm font-medium">
                              Flight Details
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`callsign-${subEvent.subEventId}`}
                                >
                                  Callsign
                                </Label>
                                <Input
                                  id={`callsign-${subEvent.subEventId}`}
                                  value={
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.callsign || ""
                                  }
                                  onChange={(e) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "callsign",
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g. QFA123"
                                  disabled={isProcessing}
                                />
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor={`aircraft-${subEvent.subEventId}`}
                                >
                                  Aircraft Type
                                </Label>
                                <Input
                                  id={`aircraft-${subEvent.subEventId}`}
                                  value={
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.aircraftType || ""
                                  }
                                  onChange={(e) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "aircraftType",
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g. A320"
                                  disabled={isProcessing}
                                />
                              </div>
                            </div>

                            {/* Airport Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`departure-icao-${subEvent.subEventId}`}
                                >
                                  {isGroupFlight
                                    ? "Departure Airport (Fixed)"
                                    : isFlyOut
                                      ? "Departure Airport (Hub)"
                                      : "Departure Airport"}
                                </Label>
                                <Input
                                  id={`departure-icao-${subEvent.subEventId}`}
                                  value={
                                    isGroupFlight
                                      ? subEvent.groupFlightDepartureIcao || ""
                                      : isFlyOut
                                        ? subEvent.hubIcao || ""
                                        : flightDetails[
                                            subEvent.subEventId.toString()
                                          ]?.customDepartureIcao || ""
                                  }
                                  onChange={(e) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "customDepartureIcao",
                                      e.target.value
                                    )
                                  }
                                  placeholder={
                                    isGroupFlight || isFlyOut
                                      ? isGroupFlight
                                        ? subEvent.groupFlightDepartureIcao ||
                                          "Fixed departure"
                                        : subEvent.hubIcao ||
                                          "Fixed hub departure"
                                      : "Enter departure ICAO"
                                  }
                                  disabled={
                                    isProcessing || isGroupFlight || isFlyOut
                                  }
                                />
                                {(isGroupFlight || isFlyOut) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Departure is fixed to:{" "}
                                    {isGroupFlight
                                      ? subEvent.groupFlightDepartureIcao
                                      : subEvent.hubIcao}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor={`arrival-icao-${subEvent.subEventId}`}
                                >
                                  {isGroupFlight
                                    ? "Arrival Airport (Fixed)"
                                    : isFlyIn
                                      ? "Arrival Airport (Hub)"
                                      : "Arrival Airport"}
                                </Label>
                                <Input
                                  id={`arrival-icao-${subEvent.subEventId}`}
                                  value={
                                    isGroupFlight
                                      ? subEvent.groupFlightArrivalIcao || ""
                                      : isFlyIn
                                        ? subEvent.hubIcao || ""
                                        : flightDetails[
                                            subEvent.subEventId.toString()
                                          ]?.customArrivalIcao || ""
                                  }
                                  onChange={(e) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "customArrivalIcao",
                                      e.target.value
                                    )
                                  }
                                  placeholder={
                                    isGroupFlight || isFlyIn
                                      ? isGroupFlight
                                        ? subEvent.groupFlightArrivalIcao ||
                                          "Fixed arrival"
                                        : subEvent.hubIcao ||
                                          "Fixed hub arrival"
                                      : "Enter arrival ICAO"
                                  }
                                  disabled={
                                    isProcessing || isGroupFlight || isFlyIn
                                  }
                                />
                                {(isGroupFlight || isFlyIn) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Arrival is fixed to:{" "}
                                    {isGroupFlight
                                      ? subEvent.groupFlightArrivalIcao
                                      : subEvent.hubIcao}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`route-${subEvent.subEventId}`}>
                                {isGroupFlight
                                  ? "Route (Based on group flight)"
                                  : "Your Flight Route"}
                              </Label>
                              <Input
                                id={`route-${subEvent.subEventId}`}
                                value={
                                  flightDetails[subEvent.subEventId.toString()]
                                    ?.route || ""
                                }
                                onChange={(e) =>
                                  updateFlightDetail(
                                    subEvent.subEventId.toString(),
                                    "route",
                                    e.target.value
                                  )
                                }
                                placeholder={
                                  isGroupFlight
                                    ? subEvent.groupFlightRoute ||
                                      "Using planned group flight route"
                                    : "Enter your flight route"
                                }
                                disabled={isProcessing}
                              />
                              {isGroupFlight && subEvent.groupFlightRoute && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Planned route: {subEvent.groupFlightRoute}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`departure-${subEvent.subEventId}`}
                                >
                                  Planned Departure Time
                                </Label>
                                <Input
                                  id={`departure-${subEvent.subEventId}`}
                                  type="datetime-local"
                                  value={
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.departureTime || ""
                                  }
                                  onChange={(e) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "departureTime",
                                      e.target.value
                                    )
                                  }
                                  disabled={isProcessing}
                                />
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor={`arrival-${subEvent.subEventId}`}
                                >
                                  Planned Arrival Time
                                </Label>
                                <Input
                                  id={`arrival-${subEvent.subEventId}`}
                                  type="datetime-local"
                                  value={
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.arrivalTime || ""
                                  }
                                  onChange={(e) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "arrivalTime",
                                      e.target.value
                                    )
                                  }
                                  disabled={isProcessing}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {selectedSubEvents.length === 0 && (
                <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                  <div className="text-amber-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm">
                    Select at least one sub-event to accept this invitation, or
                    decline the invitation below.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex gap-2 justify-between sm:justify-end">
          <Button
            variant="destructive"
            onClick={handleDeclineInvitation}
            disabled={isProcessing}
          >
            {isManagingExisting ? "Leave Event" : "Decline Invitation"}
          </Button>
          <Button
            variant="default"
            onClick={handleAcceptInvitation}
            disabled={selectedSubEvents.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isManagingExisting ? (
              "Update Participation"
            ) : (
              "Accept & Submit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

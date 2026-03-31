import { useState, useEffect, useMemo } from "react";
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
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  MapPin,
  Plane,
  AlertTriangle,
  CalendarX,
} from "lucide-react";
import { SubEventType, Event, SubEvent } from "@/module_bindings/types";
import { DateTimePicker } from "@/components/ui/datetime-picker";

interface GroupAvailabilityData {
  hostedEvents: Event[];
  attendingEvents: Event[];
  hostedSubEvents: SubEvent[];
}

interface ConflictInfo {
  hasConflict: boolean;
  sameDayEvents: { name: string; isHosted: boolean; isInternal: boolean }[];
  overlappingEvents: { name: string; start: Date; end: Date; isHosted: boolean; isInternal: boolean }[];
  isFree: boolean;
}

function checkSubEventConflicts(
  subEvent: SubEvent,
  availabilityData: GroupAvailabilityData,
  excludeEventId?: bigint
): ConflictInfo {
  const subEventStart = subEvent.scheduledStartTime.toDate();
  const subEventEnd = subEvent.scheduledEndTime.toDate();
  const subEventDay = new Date(subEventStart);
  subEventDay.setHours(0, 0, 0, 0);

  const allEvents = [
    ...availabilityData.hostedEvents.map((e) => ({ ...e, isHosted: true })),
    ...availabilityData.attendingEvents.map((e) => ({ ...e, isHosted: false })),
  ].filter((e) => !excludeEventId || e.eventId !== excludeEventId);

  const sameDayEvents: { name: string; isHosted: boolean; isInternal: boolean }[] = [];
  const overlappingEvents: { name: string; start: Date; end: Date; isHosted: boolean; isInternal: boolean }[] = [];

  const allSubEvents = availabilityData.hostedSubEvents.filter(
    (se) => !excludeEventId || se.eventId !== excludeEventId
  );

  for (const subEv of allSubEvents) {
    const existingStart = subEv.scheduledStartTime.toDate();
    const existingEnd = subEv.scheduledEndTime.toDate();
    const existingDay = new Date(existingStart);
    existingDay.setHours(0, 0, 0, 0);

    if (existingDay.getTime() === subEventDay.getTime()) {
      const parentEvent = allEvents.find((e) => e.eventId === subEv.eventId);
      if (parentEvent && !sameDayEvents.some((e) => e.name === parentEvent.name)) {
        sameDayEvents.push({ 
          name: parentEvent.name, 
          isHosted: parentEvent.isHosted, 
          isInternal: parentEvent.isInternal 
        });
      }

      const hasOverlap = subEventStart < existingEnd && subEventEnd > existingStart;
      if (hasOverlap) {
        overlappingEvents.push({
          name: `${subEv.name} (${parentEvent?.name || "Unknown"})`,
          start: existingStart,
          end: existingEnd,
          isHosted: parentEvent?.isHosted ?? true,
          isInternal: parentEvent?.isInternal ?? false,
        });
      }
    }
  }

  for (const event of allEvents) {
    const eventStart = event.startTime.toDate();
    const eventEnd = event.endTime.toDate();
    const eventDay = new Date(eventStart);
    eventDay.setHours(0, 0, 0, 0);

    if (eventDay.getTime() === subEventDay.getTime()) {
      if (!sameDayEvents.some((e) => e.name === event.name)) {
        sameDayEvents.push({ name: event.name, isHosted: event.isHosted, isInternal: event.isInternal });
      }

      const hasOverlap = subEventStart < eventEnd && subEventEnd > eventStart;
      if (hasOverlap) {
        overlappingEvents.push({
          name: event.name,
          start: eventStart,
          end: eventEnd,
          isHosted: event.isHosted,
          isInternal: event.isInternal,
        });
      }
    }
  }

  const hasConflict = overlappingEvents.length > 0;
  const isFree = sameDayEvents.length === 0;

  return {
    hasConflict,
    sameDayEvents,
    overlappingEvents,
    isFree,
  };
}

interface FlightDetails {
  callsign?: string;
  aircraftType?: string;
  departureTime?: string;
  arrivalTime?: string;
  route?: string;
  customDepartureIcao?: string;
  customArrivalIcao?: string;
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
  availabilityData?: GroupAvailabilityData;
  currentEventId?: bigint;
}

const EMPTY_BIGINT_ARRAY: bigint[] = [];
const EMPTY_FLIGHT_DETAILS: Record<string, FlightDetails> = {};

export function EventInvitationDialog({
  open,
  onOpenChange,
  invitation,
  events,
  subEvents,
  onAccept,
  onDecline,
  preSelectedSubEvents = EMPTY_BIGINT_ARRAY,
  preFilledFlightDetails = EMPTY_FLIGHT_DETAILS,
  availabilityData,
  currentEventId,
}: EventInvitationDialogProps) {
  // State for selected sub-events and flight details
  const [selectedSubEvents, setSelectedSubEvents] = useState<bigint[]>([]);
  const [flightDetails, setFlightDetails] = useState<
    Record<string, FlightDetails>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when dialog opens with a new invitation or the invitation itself changes
  useEffect(() => {
    if (open && invitation) {
      const initialSelected =
        preSelectedSubEvents.length > 0 ? preSelectedSubEvents : [];
      const initialDetails =
        preSelectedSubEvents.length > 0 ? preFilledFlightDetails : {};

      setSelectedSubEvents(initialSelected);
      setFlightDetails(initialDetails);
      setIsProcessing(false);
    }
  }, [open, invitation, preSelectedSubEvents, preFilledFlightDetails]);

  const getEvent = () => {
    if (!invitation || !events) return null;
    return events.find((e) => e.eventId === invitation.eventId);
  };

  const getEventSubEvents = () => {
    if (!invitation) return [];
    return subEvents.filter((se) => se.eventId === invitation.eventId);
  };

  const handleToggleSubEvent = (subEventId: bigint) => {
    setSelectedSubEvents((prev) => {
      if (prev.some((id) => id === subEventId)) {
        return prev.filter((id) => id !== subEventId);
      } else {
        return [...prev, subEventId];
      }
    });

    const subEvent = subEvents.find((se) => se.subEventId === subEventId);
    if (subEvent) {
      setFlightDetails((prev) => {
        if (!prev[subEventId.toString()]) {
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

  const limitIcaoLength = (icao: string) => icao.slice(0, 4);

  const isIcaoLengthValid = (icao?: string) => {
    if (!icao) return true;
    return icao.trim().length === 4;
  };

  const getIcaoLengthError = (icao?: string) => {
    if (!icao) return undefined;
    return isIcaoLengthValid(icao)
      ? undefined
      : "ICAO must be exactly 4 characters.";
  };

  const updateFlightDetail = (
    subEventId: string,
    field: keyof FlightDetails,
    value: string | undefined
  ) => {
    const limitedValue =
      field === "customDepartureIcao" || field === "customArrivalIcao"
        ? limitIcaoLength(value || "")
        : value;

    setFlightDetails((prev) => ({
      ...prev,
      [subEventId]: {
        ...prev[subEventId],
        [field]: limitedValue,
      },
    }));
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    const hasInvalidIcaoLength = selectedSubEvents.some((subEventId) => {
      const selectedSubEvent = invitationSubEvents.find(
        (se) => se.subEventId === subEventId
      );
      if (!selectedSubEvent) return false;

      const details = flightDetails[subEventId.toString()];
      const isGroupFlight = selectedSubEvent.subEventType.tag === "GroupFlight";
      const isFlyIn = selectedSubEvent.subEventType.tag === "FlyIn";
      const isFlyOut = selectedSubEvent.subEventType.tag === "FlyOut";

      if (!isGroupFlight && !isFlyOut && !isIcaoLengthValid(details?.customDepartureIcao)) {
        return true;
      }

      if (!isGroupFlight && !isFlyIn && !isIcaoLengthValid(details?.customArrivalIcao)) {
        return true;
      }

      return false;
    });
    if (hasInvalidIcaoLength) {
      toast.error("ICAO fields must be exactly 4 characters.");
      return;
    }

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

  const invitationSubEvents = useMemo(() => {
    if (!invitation) return [];
    return subEvents.filter((se) => se.eventId === invitation.eventId);
  }, [invitation, subEvents]);

  const subEventConflicts = useMemo(() => {
    if (!availabilityData) return new Map<bigint, ConflictInfo>();
    const conflicts = new Map<bigint, ConflictInfo>();
    const eventIdToExclude = currentEventId || (isManagingExisting ? invitation?.eventId : undefined);
    for (const subEvent of invitationSubEvents) {
      conflicts.set(subEvent.subEventId, checkSubEventConflicts(subEvent, availabilityData, eventIdToExclude));
    }
    return conflicts;
  }, [availabilityData, invitationSubEvents, currentEventId, isManagingExisting, invitation?.eventId]);

  const hasInvalidSelectedIcao = useMemo(() => {
    return selectedSubEvents.some((subEventId) => {
      const selectedSubEvent = invitationSubEvents.find(
        (se) => se.subEventId === subEventId
      );
      if (!selectedSubEvent) return false;

      const details = flightDetails[subEventId.toString()];
      const isGroupFlight = selectedSubEvent.subEventType.tag === "GroupFlight";
      const isFlyIn = selectedSubEvent.subEventType.tag === "FlyIn";
      const isFlyOut = selectedSubEvent.subEventType.tag === "FlyOut";

      if (!isGroupFlight && !isFlyOut && !isIcaoLengthValid(details?.customDepartureIcao)) {
        return true;
      }

      if (!isGroupFlight && !isFlyIn && !isIcaoLengthValid(details?.customArrivalIcao)) {
        return true;
      }

      return false;
    });
  }, [selectedSubEvents, invitationSubEvents, flightDetails]);

  return (
    <>
      {/* Animated backdrop to match CreateEventDialog */}
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-all duration-200 z-[60] ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto z-[60] data-[state=open]:z-[60]">
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
                    Choose which sub-events you want to participate in and
                    provide the necessary flight details.
                  </p>
                </div>

                {invitationSubEvents.map((subEvent) => {
                  const isSelected = selectedSubEvents.some(
                    (id) => id === subEvent.subEventId
                  );
                  const isGroupFlight =
                    subEvent.subEventType.tag === "GroupFlight";
                  const isFlyIn = subEvent.subEventType.tag === "FlyIn";
                  const isFlyOut = subEvent.subEventType.tag === "FlyOut";
                  const subEventFlightDetails =
                    flightDetails[subEvent.subEventId.toString()];
                  const customDepartureIcao =
                    subEventFlightDetails?.customDepartureIcao || "";
                  const customArrivalIcao =
                    subEventFlightDetails?.customArrivalIcao || "";
                  const departureIcaoError =
                    !isGroupFlight && !isFlyOut
                      ? getIcaoLengthError(customDepartureIcao)
                      : undefined;
                  const arrivalIcaoError =
                    !isGroupFlight && !isFlyIn
                      ? getIcaoLengthError(customArrivalIcao)
                      : undefined;

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
                          <p className="text-sm text-muted-foreground mb-2 overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
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
                              {format(
                                subEvent.scheduledStartTime.toDate(),
                                "p"
                              )}
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

                          {availabilityData && subEventConflicts && (() => {
                            const conflict = subEventConflicts.get(subEvent.subEventId);
                            if (!conflict) return null;
                            
                            if (conflict.isFree) {
                              return (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-700 dark:text-green-400">
                                    Group is free on this day
                                  </span>
                                </div>
                              );
                            }
                            
                            if (conflict.hasConflict) {
                              return (
                                <div className="space-y-2 mb-2 p-2 bg-red-500/10 rounded-md border border-red-500/20">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                                      Time conflict with another event
                                    </span>
                                  </div>
                                  {conflict.overlappingEvents.length > 0 && (
                                    <div className="text-xs text-red-600 dark:text-red-400 ml-6">
                                      {conflict.overlappingEvents.map((e, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                          <span>•</span>
                                          <span>
                                            {e.name} ({format(e.start, "p")} - {format(e.end, "p")})
                                            {e.isHosted && " [hosted]"}
                                            {e.isInternal && " [internal]"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            
                            if (conflict.sameDayEvents.length > 0) {
                              return (
                                <div className="mb-2 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                                  <div className="flex items-center gap-2">
                                    <CalendarX className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                      Group has {conflict.sameDayEvents.length} event(s) on this day
                                    </span>
                                  </div>
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400 ml-6 mt-1">
                                    {conflict.sameDayEvents.map((e, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        <span>•</span>
                                        <span>
                                          {e.name}
                                          {e.isHosted && " [hosted]"}
                                          {e.isInternal && " [internal]"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            
                            return null;
                          })()}

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
                                        ? subEvent.groupFlightDepartureIcao ||
                                          ""
                                        : isFlyOut
                                          ? subEvent.hubIcao || ""
                                          : customDepartureIcao
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
                                    maxLength={4}
                                    aria-invalid={!!departureIcaoError}
                                  />
                                  {departureIcaoError && (
                                    <p className="text-xs text-destructive mt-1">
                                      {departureIcaoError}
                                    </p>
                                  )}
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
                                          : customArrivalIcao
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
                                    maxLength={4}
                                    aria-invalid={!!arrivalIcaoError}
                                  />
                                  {arrivalIcaoError && (
                                    <p className="text-xs text-destructive mt-1">
                                      {arrivalIcaoError}
                                    </p>
                                  )}
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
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.route || ""
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
                                <DateTimePicker
                                  label="Planned Departure Time"
                                  value={
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.departureTime
                                      ? new Date(
                                          flightDetails[
                                            subEvent.subEventId.toString()
                                          ]!.departureTime!
                                        )
                                      : undefined
                                  }
                                  onChange={(date) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "departureTime",
                                      date ? date.toISOString() : undefined
                                    )
                                  }
                                  placeholder="Select departure time"
                                />

                                <DateTimePicker
                                  label="Planned Arrival Time"
                                  value={
                                    flightDetails[
                                      subEvent.subEventId.toString()
                                    ]?.arrivalTime
                                      ? new Date(
                                          flightDetails[
                                            subEvent.subEventId.toString()
                                          ]!.arrivalTime!
                                        )
                                      : undefined
                                  }
                                  onChange={(date) =>
                                    updateFlightDetail(
                                      subEvent.subEventId.toString(),
                                      "arrivalTime",
                                      date ? date.toISOString() : undefined
                                    )
                                  }
                                  placeholder="Select arrival time"
                                />
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
                      Select at least one sub-event to accept this invitation,
                      or decline the invitation below.
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
              disabled={
                selectedSubEvents.length === 0 ||
                isProcessing ||
                hasInvalidSelectedIcao
              }
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
    </>
  );
}

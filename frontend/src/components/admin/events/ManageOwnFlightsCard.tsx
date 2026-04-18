import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";
import {
  Calendar as CalendarIcon2,
  CheckCircle2,
  Clock,
  Loader2,
  Plane,
} from "lucide-react";
import { SubEventTypeBadge } from "./SubEventTypeBadge";
import { useEditEventContext } from "./EditEventContext";
import { useState } from "react";
import { SubEventFlightForm } from "@/components/events/SubEventFlightForm";
import type { AircraftLiveryValue } from "@/components/AircraftLiveryPicker";

export function ManageOwnFlightsCard() {
  const {
    showManageOwnFlightsDialog,
    setShowManageOwnFlightsDialog,
    eventSubEvents,
    selectedOwnSubEvents,
    ownFlightDetails,
    isSubmittingFlights,
    userTimezone,
    memberOptions,
    selectedOwnGroupLeadHex,
    setSelectedOwnGroupLeadHex,
    handleToggleOwnSubEvent,
    updateOwnFlightDetail,
    handleSubmitOwnFlights,
  } = useEditEventContext();

  const hasMissingSelectedCallsign = selectedOwnSubEvents.some((subEventId) => {
    const details = ownFlightDetails[subEventId.toString()];
    return !details?.callsign || details.callsign.trim().length === 0;
  });

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Own Flights</CardTitle>
          <CardDescription>
            Sign up your own group for the event&apos;s sub-events
          </CardDescription>
        </div>
        <Dialog
          open={showManageOwnFlightsDialog}
          onOpenChange={setShowManageOwnFlightsDialog}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plane className="h-4 w-4 mr-1" />
              {selectedOwnSubEvents.length > 0
                ? "Edit Flight Details"
                : "Sign Up for Flights"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Own Flight Participation</DialogTitle>
              <DialogDescription>
                Select which sub-events your group will participate in
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    Select Sub-Events to Join
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which sub-events your group will participate in and
                    provide the necessary flight details.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="own-group-event-lead">
                    Group Event Lead (Optional)
                  </Label>
                  <Select
                    value={selectedOwnGroupLeadHex}
                    onValueChange={setSelectedOwnGroupLeadHex}
                  >
                    <SelectTrigger id="own-group-event-lead">
                      <SelectValue placeholder="Select group event lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {memberOptions.map((member) => (
                        <SelectItem
                          key={member.identityHex}
                          value={member.identityHex}
                        >
                          {member.callsignPrefix
                            ? `[${member.callsignPrefix}] `
                            : ""}
                          {member.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Applies to all selected signups for this group in this
                    event.
                  </p>
                </div>

                {eventSubEvents.map((subEvent) => {
                  const isSelected = selectedOwnSubEvents.some(
                    (id) => id === subEvent.subEventId
                  );
                  const isGroupFlight =
                    subEvent.subEventType.tag === "GroupFlight";
                  const isFlyIn = subEvent.subEventType.tag === "FlyIn";
                  const isFlyOut = subEvent.subEventType.tag === "FlyOut";
                  const callsignValue =
                    ownFlightDetails[subEvent.subEventId.toString()]?.callsign ||
                    "";
                  const callsignError =
                    callsignValue.trim().length === 0
                      ? "Callsign is required."
                      : undefined;

                  return (
                    <Card key={subEvent.subEventId.toString()} className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`own-subevent-${subEvent.subEventId}`}
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleToggleOwnSubEvent(subEvent.subEventId)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <label
                              htmlFor={`own-subevent-${subEvent.subEventId}`}
                              className="font-medium cursor-pointer"
                            >
                              {subEvent.name}
                            </label>
                            <SubEventTypeBadge type={subEvent.subEventType} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {subEvent.description}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center">
                              <CalendarIcon2 className="h-3 w-3 mr-1" />
                              {formatDateInTimezone(
                                subEvent.scheduledStartTime.toDate(),
                                userTimezone
                              )}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeInTimezone(
                                subEvent.scheduledStartTime.toDate(),
                                userTimezone
                              )}
                            </span>

                            {isGroupFlight && (
                              <span>
                                {subEvent.groupFlightDepartureIcao} -&gt;{" "}
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
                              <SubEventFlightForm
                                subEvent={subEvent}
                                callsign={callsignValue}
                                callsignError={callsignError}
                                aircraftType={ownFlightDetails[subEvent.subEventId.toString()]?.aircraftType || ""}
                                liveryId={ownFlightDetails[subEvent.subEventId.toString()]?.liveryId || ""}
                                departureIcao={
                                  isGroupFlight
                                    ? subEvent.groupFlightDepartureIcao || ""
                                    : isFlyOut
                                      ? subEvent.hubIcao || ""
                                      : ownFlightDetails[subEvent.subEventId.toString()]?.customDepartureIcao || ""
                                }
                                arrivalIcao={
                                  isGroupFlight
                                    ? subEvent.groupFlightArrivalIcao || ""
                                    : isFlyIn
                                      ? subEvent.hubIcao || ""
                                      : ownFlightDetails[subEvent.subEventId.toString()]?.customArrivalIcao || ""
                                }
                                route={ownFlightDetails[subEvent.subEventId.toString()]?.route || ""}
                                departureTime={ownFlightDetails[subEvent.subEventId.toString()]?.departureTime}
                                arrivalTime={ownFlightDetails[subEvent.subEventId.toString()]?.arrivalTime}
                                onCallsignChange={(value) =>
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "callsign", value)
                                }
                                onAircraftChange={(value: AircraftLiveryValue) => {
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "aircraftType", value.aircraftName);
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "liveryId", value.liveryId);
                                }}
                                onDepartureIcaoChange={(value) =>
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "customDepartureIcao", value)
                                }
                                onArrivalIcaoChange={(value) =>
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "customArrivalIcao", value)
                                }
                                onRouteChange={(value) =>
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "route", value)
                                }
                                onDepartureTimeChange={(value) =>
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "departureTime", value || "")
                                }
                                onArrivalTimeChange={(value) =>
                                  updateOwnFlightDetail(subEvent.subEventId.toString(), "arrivalTime", value || "")
                                }
                                disabled={isSubmittingFlights}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {selectedOwnSubEvents.length === 0 && (
                  <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                    <div className="text-amber-500">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-sm">
                      Select at least one sub-event to participate in.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="flex gap-2 justify-between sm:justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setShowManageOwnFlightsDialog(false)}
                disabled={isSubmittingFlights}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSubmitOwnFlights}
                disabled={
                  selectedOwnSubEvents.length === 0 ||
                  isSubmittingFlights ||
                  hasMissingSelectedCallsign
                }
              >
                {isSubmittingFlights ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Save Flight Details"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {selectedOwnSubEvents.length > 0 ? (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 flex items-center gap-3">
            <div className="text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Your group has signed up for {selectedOwnSubEvents.length}{" "}
                sub-event(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Edit Flight Details" to modify your participation.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Your group has not signed up for any sub-events yet. Click "Sign Up
            for Flights" to participate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

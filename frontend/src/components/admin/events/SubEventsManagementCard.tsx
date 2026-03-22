import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Calendar as CalendarIcon2,
  Check,
  Clock,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { formatDateInTimezone, formatTimeInTimezone } from "@/utils/timezoneUtils";
import { SubEvent } from "@/module_bindings/types";
import { SubEventDialogForm } from "./SubEventDialogForm";
import { SubEventTypeBadge } from "./SubEventTypeBadge";
import { useEditEventContext } from "./EditEventContext";

export function SubEventsManagementCard() {
  const {
    eventSubEvents,
    signupsBySubEvent,
    groups,
    memberOptions,
    userTimezone,
    showAddSubEventDialog,
    setShowAddSubEventDialog,
    showEditSubEventDialog,
    setShowEditSubEventDialog,
    handleAddSubEvent,
    handleUpdateSubEvent,
    handleEditSubEventClick,
    handleDeleteSubEvent,
  } = useEditEventContext();

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sub-Events</CardTitle>
          <CardDescription>Manage the sub-events for this event</CardDescription>
        </div>

        <Dialog open={showAddSubEventDialog} onOpenChange={setShowAddSubEventDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Sub-Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Sub-Event</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <SubEventDialogForm
                mode="add"
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSubEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSubEvent}>Add Sub-Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditSubEventDialog} onOpenChange={setShowEditSubEventDialog}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit Sub-Event</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <SubEventDialogForm
                mode="edit"
                idPrefix="edit-"
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditSubEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSubEvent}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {eventSubEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {eventSubEvents.map((subEvent) => {
              const subEventSignups = signupsBySubEvent[subEvent.subEventId.toString()] || [];
              const isGroupFlight = subEvent.subEventType.tag === "GroupFlight";
              const isFlyIn = subEvent.subEventType.tag === "FlyIn";
              const isFlyOut = subEvent.subEventType.tag === "FlyOut";

              const completeSignups = subEventSignups.filter((signup) => {
                if (isGroupFlight) return !!signup.desiredDepartureTime;
                if (isFlyIn) return !!signup.departureIcao && !!signup.desiredArrivalTime;
                if (isFlyOut) return !!signup.arrivalIcao && !!signup.desiredDepartureTime;
                return false;
              });

              const pendingSignups = subEventSignups.length - completeSignups.length;

              const leadHex = subEvent.eventLead ? subEvent.eventLead.toHexString() : null;
              const leadUser = leadHex
                ? memberOptions.find((m) => m.identityHex === leadHex)
                : null;

              return (
                <Card key={subEvent.subEventId} className="gap-0 overflow-hidden">
                  <div className="bg-card border-b px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <SubEventTypeBadge type={subEvent.subEventType} />
                          {leadUser && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {leadUser.displayName}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg truncate">{subEvent.name}</h3>
                        {subEvent.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {subEvent.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditSubEventClick(subEvent)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSubEvent(subEvent.subEventId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 border-b bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-secondary/40 dark:bg-secondary/20">
                          <CalendarIcon2 className="h-4 w-4 text-[#3e57d8] dark:text-[#a2aeec]" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Date</div>
                          <div className="font-medium text-sm">
                            {formatDateInTimezone(subEvent.scheduledStartTime.toDate(), userTimezone)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-secondary/40 dark:bg-secondary/20">
                          <Clock className="h-4 w-4 text-[#3e57d8] dark:text-[#a2aeec]" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Time</div>
                          <div className="font-medium text-sm">
                            {formatTimeInTimezone(subEvent.scheduledStartTime.toDate(), userTimezone)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-secondary/40 dark:bg-secondary/20">
                          {isFlyIn ? (
                            <MapPin className="h-4 w-4 text-[#3e57d8] dark:text-[#a2aeec]" />
                          ) : (
                            <Plane className="h-4 w-4 text-[#3e57d8] dark:text-[#a2aeec]" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {isGroupFlight ? "Route" : "Hub"}
                          </div>
                          <div className="font-medium text-sm">
                            {isGroupFlight &&
                              subEvent.groupFlightDepartureIcao &&
                              subEvent.groupFlightArrivalIcao && (
                                <span className="flex items-center gap-1">
                                  {subEvent.groupFlightDepartureIcao}
                                  <ArrowRight className="h-3 w-3" />
                                  {subEvent.groupFlightArrivalIcao}
                                </span>
                              )}
                            {(isFlyIn || isFlyOut) && subEvent.hubIcao && (
                              <span>{subEvent.hubIcao}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-secondary/40 dark:bg-secondary/20">
                          <Users className="h-4 w-4 text-[#3e57d8] dark:text-[#a2aeec]" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Signups</div>
                          <div className="font-medium text-sm">{subEventSignups.length} total</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {subEventSignups.length > 0 ? (
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold">Flight Signups</h5>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-[#f94a1b]" />
                            <span className="text-xs text-muted-foreground">
                              {completeSignups.length} complete
                            </span>
                          </div>
                          {pendingSignups > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-[#a2aeec]" />
                              <span className="text-xs text-muted-foreground">
                                {pendingSignups} pending
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {subEventSignups.map((signup) => {
                          const group = groups.find((g) => g.groupId === signup.groupId);
                          const groupTag = group?.tag || "N/A";
                          const groupLogo = group?.logoUrl;

                          let isComplete = false;
                          if (isGroupFlight) {
                            isComplete = !!signup.desiredDepartureTime;
                          } else if (isFlyIn) {
                            isComplete = !!signup.departureIcao && !!signup.desiredArrivalTime;
                          } else if (isFlyOut) {
                            isComplete = !!signup.arrivalIcao && !!signup.desiredDepartureTime;
                          }

                          const departureTime = signup.desiredDepartureTime
                            ? formatTimeInTimezone(signup.desiredDepartureTime.toDate(), userTimezone)
                            : null;
                          const arrivalTime = signup.desiredArrivalTime
                            ? formatTimeInTimezone(signup.desiredArrivalTime.toDate(), userTimezone)
                            : null;

                          return (
                            <div
                              key={signup.signupId.toString()}
                              className={`border rounded-lg p-3 ${
                                isComplete
                                  ? "border-[#f94a1b]/30 dark:border-[#f94a1b]/20 bg-[#f94a1b]/5 dark:bg-[#f94a1b]/10"
                                  : "border-[#a2aeec]/50 dark:border-[#a2aeec]/30 bg-[#a2aeec]/10 dark:bg-[#a2aeec]/10"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {groupLogo ? (
                                    <img
                                      src={groupLogo}
                                      alt={groupTag}
                                      className="h-7 w-7 rounded-full object-cover border border-border"
                                    />
                                  ) : (
                                    <div className="h-7 w-7 bg-background border border-border rounded-full flex items-center justify-center text-xs font-medium">
                                      {groupTag.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium text-sm">{groupTag}</div>
                                    {signup.callsign && (
                                      <div className="text-xs text-muted-foreground">
                                        {signup.callsign}
                                        {signup.aircraftType && ` • ${signup.aircraftType}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant={isComplete ? "default" : "secondary"}
                                  className={
                                    isComplete
                                      ? "bg-[#f94a1b] hover:bg-[#f94a1b]/90 dark:bg-[#f94a1b] dark:hover:bg-[#f94a1b]/90"
                                      : ""
                                  }
                                >
                                  {isComplete ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" /> Ready
                                    </>
                                  ) : (
                                    "Pending"
                                  )}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                {isGroupFlight && departureTime && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Dep: {departureTime}</span>
                                  </div>
                                )}

                                {isFlyIn && (
                                  <>
                                    {signup.departureIcao && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Plane className="h-3.5 w-3.5" />
                                        <span>From: {signup.departureIcao}</span>
                                      </div>
                                    )}
                                    {arrivalTime && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Arr: {arrivalTime}</span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {isFlyOut && (
                                  <>
                                    {arrivalTime && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Dep: {arrivalTime}</span>
                                      </div>
                                    )}
                                    {signup.arrivalIcao && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>To: {signup.arrivalIcao}</span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {signup.routeDetails && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                                    <ArrowRight className="h-3.5 w-3.5" />
                                    <span className="truncate">{signup.routeDetails}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center">
                      <div className="text-muted-foreground/60">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No signups yet</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No sub-events. Add one to get started!</p>
        )}
      </CardContent>
    </Card>
  );
}

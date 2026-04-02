import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { SubEventDialogForm } from "./SubEventDialogForm";
import { SubEventTypeBadge } from "./SubEventTypeBadge";
import { useEditEventContext } from "./EditEventContext";
import { SubEventFormState } from "./types";

export function SubEventsManagementCard() {
  const {
    eventSubEvents,
    signupsBySubEvent,
    groups,
    memberOptions,
    userTimezone,
    isAdvancedSubEventsMode,
    setIsAdvancedSubEventsMode,
    showAddSubEventDialog,
    setShowAddSubEventDialog,
    showEditSubEventDialog,
    setShowEditSubEventDialog,
    handleAddSubEvent,
    handleUpdateSubEvent,
    handleEditSubEventClick,
    handleDeleteSubEvent,
    subEventForm,
    editSubEventForm,
    toSubEventFormState,
    updateFirstSubEventFromForm,
    name,
    description,
  } = useEditEventContext();

  const [addFormDraft, setAddFormDraft] = useState<SubEventFormState>(subEventForm);
  const [editFormDraft, setEditFormDraft] = useState<SubEventFormState>(editSubEventForm);
  const [firstWaveForm, setFirstWaveForm] = useState<SubEventFormState | null>(null);
  const wasAddDialogOpen = useRef(false);
  const wasEditDialogOpen = useRef(false);

  useEffect(() => {
    if (showAddSubEventDialog && !wasAddDialogOpen.current) {
      setAddFormDraft(subEventForm);
    }
    wasAddDialogOpen.current = showAddSubEventDialog;
  }, [showAddSubEventDialog, subEventForm]);

  useEffect(() => {
    if (showEditSubEventDialog && !wasEditDialogOpen.current) {
      setEditFormDraft(editSubEventForm);
    }
    wasEditDialogOpen.current = showEditSubEventDialog;
  }, [showEditSubEventDialog, editSubEventForm]);

  useEffect(() => {
    if (eventSubEvents.length > 0 && !isAdvancedSubEventsMode) {
      const firstSubEvent = eventSubEvents[0];
      setFirstWaveForm(toSubEventFormState(firstSubEvent as any));
    }
  }, [eventSubEvents, isAdvancedSubEventsMode, toSubEventFormState]);

  const handleFirstWaveFormChange = (form: SubEventFormState) => {
    setFirstWaveForm(form);
  };

  const handleAddNewWave = () => {
    setIsAdvancedSubEventsMode(true);
    setShowAddSubEventDialog(true);
  };

  const subEventCards = useMemo(() => {
    if (eventSubEvents.length === 0) {
      return <p className="text-muted-foreground">No sub-events. Add one to get started!</p>;
    }

    return (
      <div className="grid grid-cols-1 gap-6">
        {eventSubEvents.map((subEvent, index) => {
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
                    <h3 className="font-semibold text-lg truncate">{subEvent.name || `Wave ${index + 1}`}</h3>
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
                      onClick={() => handleEditSubEventClick(subEvent as any)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSubEvent(subEvent.subEventId)}
                      disabled={eventSubEvents.length <= 1}
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
    );
  }, [
    eventSubEvents,
    signupsBySubEvent,
    groups,
    memberOptions,
    userTimezone,
    handleEditSubEventClick,
    handleDeleteSubEvent,
  ]);

  if (!isAdvancedSubEventsMode && eventSubEvents.length === 1) {
    const firstSubEvent = eventSubEvents[0];
    const firstSubEventSignups =
      signupsBySubEvent[firstSubEvent.subEventId.toString()] || [];
    const isGroupFlight = firstSubEvent.subEventType.tag === "GroupFlight";
    const isFlyIn = firstSubEvent.subEventType.tag === "FlyIn";
    const isFlyOut = firstSubEvent.subEventType.tag === "FlyOut";

    const completeSignups = firstSubEventSignups.filter((signup) => {
      if (isGroupFlight) return !!signup.desiredDepartureTime;
      if (isFlyIn) return !!signup.departureIcao && !!signup.desiredArrivalTime;
      if (isFlyOut) return !!signup.arrivalIcao && !!signup.desiredDepartureTime;
      return false;
    });

    const pendingSignups = firstSubEventSignups.length - completeSignups.length;
    
    return (
      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Wave Details</CardTitle>
            <CardDescription>
              Set the wave type, time, airports, and notes. Add more waves if this event is more complex.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {firstWaveForm && (
            <SubEventDialogForm
              mode="edit"
              form={firstWaveForm}
              setForm={handleFirstWaveFormChange}
              userTimezone={userTimezone}
              members={memberOptions}
              showTypeField
              showIdentityFields={false}
              showScheduleFields
              idPrefix="edit-first-wave-"
            />
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewWave}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Wave
          </Button>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-sm font-semibold">Joining This Wave</h5>
              {firstSubEventSignups.length > 0 && (
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
              )}
            </div>

            {firstSubEventSignups.length > 0 ? (
              <div className="space-y-2">
                {firstSubEventSignups.map((signup) => {
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
            ) : (
              <div className="py-3 text-center">
                <div className="text-muted-foreground/60">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No signups yet</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <Dialog open={showAddSubEventDialog} onOpenChange={setShowAddSubEventDialog}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Wave</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <SubEventDialogForm
                mode="add"
                form={addFormDraft}
                setForm={(form) => setAddFormDraft(form)}
                userTimezone={userTimezone}
                members={memberOptions}
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSubEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleAddSubEvent(addFormDraft)}>Add Wave</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditSubEventDialog} onOpenChange={setShowEditSubEventDialog}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit Wave</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <SubEventDialogForm
                mode="edit"
                form={editFormDraft}
                setForm={(form) => setEditFormDraft(form)}
                userTimezone={userTimezone}
                members={memberOptions}
                idPrefix="edit-"
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditSubEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateSubEvent(editFormDraft)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Waves</CardTitle>
          <CardDescription>Manage the waves for this event</CardDescription>
        </div>

        <Dialog open={showAddSubEventDialog} onOpenChange={setShowAddSubEventDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Wave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Wave</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <SubEventDialogForm
                mode="add"
                form={addFormDraft}
                setForm={(form) => setAddFormDraft(form)}
                userTimezone={userTimezone}
                members={memberOptions}
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSubEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleAddSubEvent(addFormDraft)}>Add Wave</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditSubEventDialog} onOpenChange={setShowEditSubEventDialog}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit Wave</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <SubEventDialogForm
                mode="edit"
                form={editFormDraft}
                setForm={(form) => setEditFormDraft(form)}
                userTimezone={userTimezone}
                members={memberOptions}
                idPrefix="edit-"
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditSubEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateSubEvent(editFormDraft)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>{subEventCards}</CardContent>
    </Card>
  );
}

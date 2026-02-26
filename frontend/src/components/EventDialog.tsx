import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Infer } from "spacetimedb";
import { Event, SubEventType } from "@/module_bindings";
import { format } from "date-fns";

type Event = Infer<typeof Event>;
type SubEventType = Infer<typeof SubEventType>;
import {
  Calendar,
  Clock,
  Check,
  Plane,
  MapPin,
  ExternalLink,
  Users,
} from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useSubEvents,
  useGroups,
  useFlightSignups,
  useEventParticipants,
} from "@/hooks/spacetimeHooks";

interface EventDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister?: () => void;
  canRegister?: boolean;
}

const EventDialog = ({
  event,
  open,
  onOpenChange,
  onRegister,
  canRegister = false,
}: EventDialogProps) => {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [activeTab, setActiveTab] = useState("details");

  // Use hooks to get real-time data
  const subEvents = useSubEvents();
  const groups = useGroups();
  const flightSignups = useFlightSignups();
  const eventParticipants = useEventParticipants();

  const handleShare = () => {
    const eventUrl = `${window.location.origin}/event/${event.eventId}`;
    copyToClipboard(eventUrl);
  };

  // Filter sub-events that belong to this event
  const eventSubEvents = subEvents.filter((se) => se.eventId === event.eventId);

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

  // Calculate how many unique groups are participating
  const participatingGroups = [
    ...new Set(
      eventParticipants
        .filter((ep) => ep.eventId === event.eventId)
        .map((ep) => ep.groupId.toString())
    ),
  ];

  const totalParticipatingGroups = participatingGroups.length;

  const getSubEventTypeBadge = (type: SubEventType) => {
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

  return (
    <>
      {/* Add a backdrop div that animates blur and covers the header */}
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-all duration-200 z-[49] ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-[70vw] min-h-[90vh] max-w-[90vw] max-h-[90vh] overflow-y-auto relative z-50 fixed bottom-0 left-1/2 transform -translate-x-1/2 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {event.name}
            </DialogTitle>
          </DialogHeader>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Event Banner */}
              {event.bannerUrl && (
                <div className="relative h-48 w-full rounded-lg overflow-hidden">
                  <img
                    src={event.bannerUrl}
                    alt={event.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              {/* Tabs Navigation for Description and Activities */}
              <Tabs
                defaultValue={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-3 mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="activities">
                    Activities ({eventSubEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="participants">
                    Participants ({eventSignups.length})
                  </TabsTrigger>
                </TabsList>

                <div className="relative min-h-[400px]">
                  {/* Details Tab */}
                  <TabsContent
                    value="details"
                    className="space-y-4 absolute top-0 left-0 w-full"
                    forceMount
                    hidden={activeTab !== "details"}
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Description
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {event.description}
                      </p>
                    </div>

                    {totalParticipatingGroups > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">
                          Attendance
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {totalParticipatingGroups} group
                              {totalParticipatingGroups !== 1 ? "s" : ""}{" "}
                              attending
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {eventSignups.length} total registration
                              {eventSignups.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activities Tab */}
                  <TabsContent
                    value="activities"
                    className="absolute top-0 left-0 w-full"
                    forceMount
                    hidden={activeTab !== "activities"}
                  >
                    {eventSubEvents.length > 0 ? (
                      <div className="space-y-4">
                        {eventSubEvents.map((subEvent) => {
                          const subEventSignups =
                            signupsBySubEvent[subEvent.subEventId.toString()] ||
                            [];
                          const acceptedSignups = subEventSignups.filter(
                            (signup) => !!signup.desiredDepartureTime
                          );
                          const isGroupFlight =
                            subEvent.subEventType.tag === "GroupFlight";
                          const isFlyIn = subEvent.subEventType.tag === "FlyIn";
                          const isFlyOut =
                            subEvent.subEventType.tag === "FlyOut";

                          return (
                            <Card
                              key={subEvent.subEventId.toString()}
                              className="overflow-hidden"
                            >
                              <CardContent className="p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <div>
                                    {getSubEventTypeBadge(
                                      subEvent.subEventType
                                    )}
                                    <h4 className="font-medium mt-1">
                                      {subEvent.name}
                                    </h4>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1"
                                  >
                                    <Users className="h-3 w-3" />
                                    {acceptedSignups.length} /{" "}
                                    {subEventSignups.length}
                                  </Badge>
                                </div>

                                <p className="text-sm text-muted-foreground mb-3">
                                  {subEvent.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {format(
                                        subEvent.scheduledStartTime.toDate(),
                                        "MMM d, yyyy"
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {format(
                                        subEvent.scheduledStartTime.toDate(),
                                        "h:mm a"
                                      )}
                                    </span>
                                  </div>

                                  {isGroupFlight &&
                                    subEvent.groupFlightDepartureIcao &&
                                    subEvent.groupFlightArrivalIcao && (
                                      <div className="flex items-center gap-1">
                                        <Plane className="h-3 w-3 text-muted-foreground" />
                                        <span>
                                          {subEvent.groupFlightDepartureIcao} →{" "}
                                          {subEvent.groupFlightArrivalIcao}
                                        </span>
                                      </div>
                                    )}

                                  {isFlyIn && subEvent.hubIcao && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span>To: {subEvent.hubIcao}</span>
                                    </div>
                                  )}

                                  {isFlyOut && subEvent.hubIcao && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span>From: {subEvent.hubIcao}</span>
                                    </div>
                                  )}
                                </div>

                                {subEvent.notes && (
                                  <div className="mt-3 border-t pt-3">
                                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                                      <span className="font-medium">
                                        Notes:
                                      </span>{" "}
                                      {subEvent.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Display signups for this sub-event */}
                                {subEventSignups.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-medium">
                                        Registered Groups
                                      </h5>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {subEventSignups.length}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {subEventSignups
                                        .slice(0, 5)
                                        .map((signup) => {
                                          const group = groups.find(
                                            (g) => g.groupId === signup.groupId
                                          );
                                          if (!group) return null;

                                          return (
                                            <Badge
                                              key={signup.signupId.toString()}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {group.name}
                                            </Badge>
                                          );
                                        })}
                                      {subEventSignups.length > 5 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          +{subEventSignups.length - 5} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px]">
                        <p className="text-center text-muted-foreground">
                          No activities scheduled for this event yet.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Participants Tab */}
                  <TabsContent
                    value="participants"
                    className="absolute top-0 left-0 w-full h-full"
                    forceMount
                    hidden={activeTab !== "participants"}
                  >
                    <ScrollArea className="h-[400px] w-full pr-4">
                      {eventSubEvents.length > 0 && eventSignups.length > 0 ? (
                        <div className="space-y-6">
                          {eventSubEvents.map((subEvent) => {
                            const subEventSignups =
                              signupsBySubEvent[
                                subEvent.subEventId.toString()
                              ] || [];

                            if (subEventSignups.length === 0) return null;

                            return (
                              <div key={subEvent.subEventId.toString()}>
                                <div className="flex items-center gap-2 mb-3">
                                  <h3 className="text-lg font-medium">
                                    {subEvent.name}
                                  </h3>
                                  {getSubEventTypeBadge(subEvent.subEventType)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {subEventSignups.map((signup) => {
                                    const group = groups.find(
                                      (g) => g.groupId === signup.groupId
                                    );
                                    const groupName =
                                      group?.name || "Unknown Group";
                                    const groupLogoUrl = group?.logoUrl;
                                    const isAccepted =
                                      !!signup.desiredDepartureTime;
                                    const isGroupFlight =
                                      subEvent.subEventType.tag ===
                                      "GroupFlight";
                                    const isFlyIn =
                                      subEvent.subEventType.tag === "FlyIn";
                                    const isFlyOut =
                                      subEvent.subEventType.tag === "FlyOut";

                                    return (
                                      <div
                                        key={signup.signupId.toString()}
                                        className="border rounded-lg p-3"
                                      >
                                        <div className="flex justify-between items-center mb-1">
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              {groupLogoUrl ? (
                                                <img
                                                  src={groupLogoUrl}
                                                  alt={groupName}
                                                  className="object-cover"
                                                />
                                              ) : (
                                                <AvatarFallback className="text-xs">
                                                  {group?.name.charAt(0) || "?"}
                                                </AvatarFallback>
                                              )}
                                            </Avatar>
                                            <span className="font-medium">
                                              {groupName}
                                            </span>
                                          </div>
                                          {isAccepted ? (
                                            <Badge
                                              variant="default"
                                              className="text-xs py-0 h-5"
                                            >
                                              <Check className="h-3 w-3 mr-1" />{" "}
                                              Confirmed
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className="text-xs py-0 h-5"
                                            >
                                              Pending
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="space-y-1 text-xs text-muted-foreground">
                                          {isGroupFlight &&
                                            signup.desiredDepartureTime && (
                                              <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Departure:{" "}
                                                {format(
                                                  signup.desiredDepartureTime.toDate(),
                                                  "MMM d, h:mm a"
                                                )}
                                              </div>
                                            )}

                                          {isFlyIn && (
                                            <>
                                              {signup.departureIcao && (
                                                <div className="flex items-center gap-1">
                                                  <Plane className="h-3 w-3" />
                                                  From: {signup.departureIcao}
                                                </div>
                                              )}
                                              {signup.desiredArrivalTime && (
                                                <div className="flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  Arrival:{" "}
                                                  {format(
                                                    signup.desiredArrivalTime.toDate(),
                                                    "MMM d, h:mm a"
                                                  )}
                                                </div>
                                              )}
                                            </>
                                          )}

                                          {isFlyOut && (
                                            <>
                                              {signup.arrivalIcao && (
                                                <div className="flex items-center gap-1">
                                                  <Plane className="h-3 w-3" />
                                                  To: {signup.arrivalIcao}
                                                </div>
                                              )}
                                              {signup.desiredDepartureTime && (
                                                <div className="flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  Departure:{" "}
                                                  {format(
                                                    signup.desiredDepartureTime.toDate(),
                                                    "MMM d, h:mm a"
                                                  )}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <p className="text-center text-muted-foreground">
                            No participants have registered for this event yet.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Event Details Card */}
            <div className="rounded-lg border p-4 space-y-5 h-fit sticky top-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(event.startTime.toDate(), "MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(event.startTime.toDate(), "h:mm a")} -{" "}
                  {format(event.endTime.toDate(), "h:mm a")}
                </span>
              </div>

              {/* Groups Participating */}
              {totalParticipatingGroups > 0 && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {totalParticipatingGroups} group
                    {totalParticipatingGroups !== 1 ? "s" : ""} attending
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {canRegister && onRegister && (
                  <Button className="w-full" onClick={onRegister}>
                    Register for Event
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleShare}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    "Share Event"
                  )}
                </Button>
              </div>

              {/* Quick Stats */}
              {eventSubEvents.length > 0 && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <h4 className="text-sm font-medium">Event Activities</h4>
                  <div className="flex flex-wrap gap-2">
                    {eventSubEvents.slice(0, 3).map((subEvent) => (
                      <Badge
                        key={subEvent.subEventId.toString()}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setActiveTab("activities")}
                      >
                        {subEvent.name}
                      </Badge>
                    ))}

                    {eventSubEvents.length > 3 && (
                      <Badge
                        variant="outline"
                        onClick={() => setActiveTab("activities")}
                        className="cursor-pointer"
                      >
                        +{eventSubEvents.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* IFC Event Link */}
              {event.ifcEventLink && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-2">External Links</h4>
                  <a
                    href={event.ifcEventLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center"
                  >
                    View IFC Event Page
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventDialog;

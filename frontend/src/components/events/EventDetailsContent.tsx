import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Plane,
  Share2,
  Users,
} from "lucide-react";
import { Infer } from "spacetimedb";
import { Event, SubEventType } from "@/module_bindings";
import {
  useEventParticipants,
  useFlightSignups,
  useGroups,
  useSubEvents,
} from "@/hooks/spacetimeHooks";
import {
  formatInTimezone,
  formatTimeInTimezone,
  useUserTimezone,
} from "@/utils/timezoneUtils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type EventType = Infer<typeof Event>;
type SubEventTypeType = Infer<typeof SubEventType>;

interface EventDetailsContentProps {
  event: EventType;
  canRegister?: boolean;
  onRegister?: () => void;
  className?: string;
}

function getSubEventTypeBadge(type: SubEventTypeType) {
  if (type.tag === "GroupFlight") {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Plane className="h-3 w-3" />
        Group Flight
      </Badge>
    );
  }

  if (type.tag === "FlyIn") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        Fly-in
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Plane className="h-3 w-3" />
      Fly-out
    </Badge>
  );
}

export function EventDetailsContent({
  event,
  canRegister = false,
  onRegister,
  className,
}: EventDetailsContentProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingScrollSubEventId, setPendingScrollSubEventId] = useState<
    string | null
  >(null);
  const [highlightedSubEventId, setHighlightedSubEventId] = useState<
    string | null
  >(null);
  const { copied, copyToClipboard } = useCopyToClipboard();
  const subEventRefs = useRef<Record<string, HTMLElement | null>>({});

  const subEvents = useSubEvents();
  const groups = useGroups();
  const flightSignups = useFlightSignups();
  const eventParticipants = useEventParticipants();
  const userTimezone = useUserTimezone();

  const eventSubEvents = useMemo(
    () => subEvents.filter((subEvent) => subEvent.eventId === event.eventId),
    [subEvents, event.eventId]
  );

  const signupsBySubEvent = useMemo(() => {
    const map = new Map<bigint, typeof flightSignups>();

    eventSubEvents.forEach((subEvent) => {
      map.set(
        subEvent.subEventId,
        flightSignups.filter(
          (signup) => signup.subEventId === subEvent.subEventId
        )
      );
    });

    return map;
  }, [eventSubEvents, flightSignups]);

  const totalSignups = useMemo(
    () =>
      Array.from(signupsBySubEvent.values()).reduce(
        (sum, list) => sum + list.length,
        0
      ),
    [signupsBySubEvent]
  );

  const uniqueParticipantGroups = useMemo(() => {
    const acceptedGroups = eventParticipants
      .filter((participant) => participant.eventId === event.eventId)
      .map((participant) => participant.groupId.toString());
    return new Set(acceptedGroups).size;
  }, [eventParticipants, event.eventId]);

  const handleShare = () => {
    copyToClipboard(`${window.location.origin}/event/${event.eventId}`);
  };

  const openSubEventInDetails = (subEventId: bigint) => {
    const targetId = subEventId.toString();
    setActiveTab("subevents");
    setPendingScrollSubEventId(targetId);
    setHighlightedSubEventId(targetId);
  };

  useEffect(() => {
    if (activeTab !== "subevents" || !pendingScrollSubEventId) return;

    const targetElement = subEventRefs.current[pendingScrollSubEventId];
    if (!targetElement) return;

    requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollSubEventId(null);
    });
  }, [activeTab, pendingScrollSubEventId]);

  useEffect(() => {
    if (!highlightedSubEventId) return;

    const timeout = setTimeout(() => {
      setHighlightedSubEventId(null);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [highlightedSubEventId]);

  const groupLabel = uniqueParticipantGroups === 1 ? "group" : "groups";
  const signupLabel = totalSignups === 1 ? "signup" : "signups";

  return (
    <div className={`flex h-full min-h-0 flex-col ${className || ""}`}>
      <div className="relative border-b">
        <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-slate-100 via-sky-50 to-emerald-50" />
        {event.bannerUrl && (
          <img
            src={event.bannerUrl}
            alt={event.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-black/15" />
        <div className="absolute bottom-3 left-3 right-3 z-10 sm:bottom-4 sm:left-4 sm:right-4">
          <h1 className="text-white text-xl sm:text-3xl font-bold leading-tight">
            {event.name}
          </h1>
          <p className="text-white/90 text-sm line-clamp-2">{event.description}</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="min-h-0 border-r flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full min-h-0 flex flex-col"
          >
            <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2 sm:mx-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subevents">
                Sub-events ({eventSubEvents.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="mt-2 flex-1 min-h-0 px-3 pb-3 sm:mt-3 sm:px-4 sm:pb-4">
              <TabsContent value="overview" className="mt-2 space-y-3 sm:space-y-4">
                <div className="rounded-2xl border bg-muted/30 px-4 py-3 sm:px-5">
                  <div className="space-y-1">
                    <p className="text-lg sm:text-2xl font-semibold leading-tight">
                      {formatInTimezone(event.startTime, userTimezone, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm sm:text-lg font-medium text-muted-foreground">
                      {formatTimeInTimezone(event.startTime, userTimezone)} - {" "}
                      {formatTimeInTimezone(event.endTime, userTimezone)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {uniqueParticipantGroups} {groupLabel}
                      </span>{" "}
                      /{" "}
                      <span className="font-semibold text-foreground">
                        {totalSignups} {signupLabel}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  {eventSubEvents.map((subEvent) => {
                    const subEventSignups =
                      signupsBySubEvent.get(subEvent.subEventId) || [];
                    const subEventStart = subEvent.scheduledStartTime.toDate();
                    const subEventEnd = subEvent.scheduledEndTime.toDate();
                    const isSameAsMainEventDay =
                      formatInTimezone(subEventStart, userTimezone, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }) ===
                      formatInTimezone(event.startTime, userTimezone, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      });
                    const routeElement =
                      subEvent.subEventType.tag === "GroupFlight" &&
                      subEvent.groupFlightDepartureIcao &&
                      subEvent.groupFlightArrivalIcao ? (
                        <span className="inline-flex items-center gap-2">
                          <span>{subEvent.groupFlightDepartureIcao}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span>{subEvent.groupFlightArrivalIcao}</span>
                        </span>
                      ) : subEvent.hubIcao ? (
                        <span>
                          {subEvent.subEventType.tag === "FlyIn" ? "To" : "From"}{" "}
                          {subEvent.hubIcao}
                        </span>
                      ) : null;

                    return (
                      <div
                        key={subEvent.subEventId.toString()}
                        role="button"
                        tabIndex={0}
                        onClick={() => openSubEventInDetails(subEvent.subEventId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openSubEventInDetails(subEvent.subEventId);
                          }
                        }}
                        className="group rounded-xl border bg-card p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/30 hover:shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {getSubEventTypeBadge(subEvent.subEventType)}
                          <p className="font-semibold text-left transition-colors group-hover:text-primary">
                            {subEvent.name}
                          </p>
                          <Badge variant="outline" className="ml-auto">
                            <Users className="mr-1 h-3 w-3" />
                            {subEventSignups.length}
                          </Badge>
                        </div>

                        {routeElement && (
                          <p className="mt-2 text-base sm:text-lg font-semibold tracking-tight">
                            {routeElement}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {formatTimeInTimezone(subEventStart, userTimezone)} - {" "}
                              {formatTimeInTimezone(subEventEnd, userTimezone)}
                            </span>
                          </span>
                          {!isSameAsMainEventDay && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatInTimezone(subEventStart, userTimezone, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="subevents" className="mt-2 space-y-3 pb-4">
                <div className="rounded-2xl border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium">
                    {eventSubEvents.length} sub-event
                    {eventSubEvents.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Schedule, structure, and participating groups.
                  </p>
                </div>

                {eventSubEvents.map((subEvent) => {
                  const subEventSignups =
                    signupsBySubEvent.get(subEvent.subEventId) || [];
                  const routeElement =
                    subEvent.subEventType.tag === "GroupFlight" &&
                    subEvent.groupFlightDepartureIcao &&
                    subEvent.groupFlightArrivalIcao ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{subEvent.groupFlightDepartureIcao}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{subEvent.groupFlightArrivalIcao}</span>
                      </span>
                    ) : subEvent.hubIcao ? (
                      <span>
                        {subEvent.subEventType.tag === "FlyIn" ? "To" : "From"}: {" "}
                        {subEvent.hubIcao}
                      </span>
                    ) : null;

                  const subEventIdString = subEvent.subEventId.toString();

                  return (
                    <article
                      key={subEventIdString}
                      ref={(el) => {
                        subEventRefs.current[subEventIdString] = el;
                      }}
                      className={`rounded-2xl border bg-card px-4 py-4 sm:px-5 transition-shadow ${
                        highlightedSubEventId === subEventIdString
                          ? "ring-2 ring-primary/40"
                          : ""
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div>{getSubEventTypeBadge(subEvent.subEventType)}</div>
                          <h4 className="text-base sm:text-lg font-semibold leading-tight">
                            {subEvent.name}
                          </h4>
                          <Badge variant="outline" className="ml-auto">
                            <Users className="mr-1 h-3 w-3" />
                            {subEventSignups.length}
                          </Badge>
                        </div>

                        <div className="rounded-xl border bg-muted/25 px-3 py-3">
                          <p className="text-base font-semibold leading-tight">
                            {formatInTimezone(
                              subEvent.scheduledStartTime,
                              userTimezone,
                              {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                          <p className="mt-1 text-sm font-medium text-muted-foreground">
                            {formatTimeInTimezone(
                              subEvent.scheduledStartTime,
                              userTimezone
                            )} - {" "}
                            {formatTimeInTimezone(
                              subEvent.scheduledEndTime,
                              userTimezone
                            )}
                          </p>
                          {routeElement && (
                            <p className="mt-2 text-sm font-medium">{routeElement}</p>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {subEvent.description}
                        </p>

                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                            Who joined this sub-event
                          </p>
                          {subEventSignups.length > 0 ? (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {subEventSignups.map((signup) => {
                                const group = groups.find(
                                  (g) => g.groupId === signup.groupId
                                );
                                return (
                                  <div
                                    key={signup.signupId.toString()}
                                    className="flex items-center gap-2 rounded-md border bg-background p-2"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={group?.logoUrl || ""}
                                        alt={group?.name || "Group"}
                                      />
                                      <AvatarFallback>
                                        {group?.tag ||
                                          group?.name?.slice(0, 2) ||
                                          "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {group?.name || "Unknown Group"}
                                      </p>
                                      {(signup.callsign ||
                                        signup.aircraftType) && (
                                        <p className="truncate text-xs text-muted-foreground">
                                          {[signup.callsign, signup.aircraftType]
                                            .filter(Boolean)
                                            .join(" - ")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                              No groups have joined this sub-event yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="border-t lg:border-t-0 p-2 sm:p-4 space-y-2 sm:space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs sm:h-10 sm:text-sm"
            onClick={handleShare}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            {copied ? "Link Copied" : "Share Event"}
          </Button>

          {canRegister && onRegister && (
            <Button
              size="sm"
              className="hidden sm:flex w-full h-8 text-xs sm:h-10 sm:text-sm"
              onClick={onRegister}
            >
              Register for Event
            </Button>
          )}

          <div className="hidden sm:block rounded-lg border px-2.5 py-2 sm:p-3">
            <h4 className="text-xs sm:text-sm font-semibold">Quick Snapshot</h4>
            <div className="mt-1.5 space-y-1 text-xs sm:text-sm text-muted-foreground leading-tight">
              <p>{eventSubEvents.length} sub-events</p>
              <p>{totalSignups} total signups</p>
              <p>{uniqueParticipantGroups} participating groups</p>
            </div>
          </div>

          {event.ifcEventLink && (
            <a
              href={event.ifcEventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center text-xs sm:text-sm text-primary hover:underline"
            >
              View IFC Event Page
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

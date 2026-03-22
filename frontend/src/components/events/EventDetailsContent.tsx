import { useEffect, useMemo, useRef, useState } from "react";
import { Infer } from "spacetimedb";
import { Event } from "@/module_bindings/types";
import {
  useEventParticipants,
  useFlightSignups,
  useGroups,
  useSubEvents,
} from "@/hooks/spacetimeHooks";
import { useUserTimezone } from "@/utils/timezoneUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventBanner } from "./EventBanner";
import { EventDateTimeInfo } from "./EventDateTimeInfo";
import { EventSidebar } from "./EventSidebar";
import { SubEventCard } from "./SubEventCard";
import { SubEventDetails } from "./SubEventDetails";

type EventType = Infer<typeof Event>;

interface EventDetailsContentProps {
  event: EventType;
  canRegister?: boolean;
  onRegister?: () => void;
  className?: string;
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

  return (
    <div className={`flex h-full min-h-0 flex-col ${className || ""}`}>
      <EventBanner event={event} />

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
              <TabsContent
                value="overview"
                className="mt-2 space-y-3 sm:space-y-4"
              >
                <EventDateTimeInfo
                  startTime={event.startTime.toDate()}
                  endTime={event.endTime.toDate()}
                  timezone={userTimezone}
                  groupCount={uniqueParticipantGroups}
                  signupCount={totalSignups}
                />

                <div className="space-y-2.5 sm:space-y-3">
                  {eventSubEvents.map((subEvent) => {
                    const subEventSignups =
                      signupsBySubEvent.get(subEvent.subEventId) || [];

                    return (
                      <SubEventCard
                        key={subEvent.subEventId.toString()}
                        subEvent={subEvent}
                        signupCount={subEventSignups.length}
                        userTimezone={userTimezone}
                        mainEventStartTime={event.startTime.toDate()}
                        onClick={() =>
                          openSubEventInDetails(subEvent.subEventId)
                        }
                      />
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
                  const subEventIdString = subEvent.subEventId.toString();

                  return (
                    <div
                      key={subEventIdString}
                      ref={(el) => {
                        subEventRefs.current[subEventIdString] = el;
                      }}
                    >
                      <SubEventDetails
                        subEvent={subEvent}
                        signups={subEventSignups}
                        groups={groups}
                        userTimezone={userTimezone}
                        isHighlighted={
                          highlightedSubEventId === subEventIdString
                        }
                      />
                    </div>
                  );
                })}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <EventSidebar
          eventId={event.eventId}
          subEventCount={eventSubEvents.length}
          totalSignups={totalSignups}
          participantGroups={uniqueParticipantGroups}
          ifcEventLink={event.ifcEventLink}
          canRegister={canRegister}
          onRegister={onRegister}
        />
      </div>
    </div>
  );
}

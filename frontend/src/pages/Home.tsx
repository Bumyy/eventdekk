import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import EventDialog from "@/components/EventDialog";
import {
  useEvents,
  useDiscoveryEvents,
  useGroups,
} from "@/hooks/spacetimeHooks";
import { addDays, isAfter, isBefore } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Event as SpacetimeEvent } from "../module_bindings";
import { Infer } from "spacetimedb";
import { toUserTimezoneDate } from "@/utils/timezoneUtils";
import { Badge } from "@/components/ui/badge";

type EventType = Infer<typeof SpacetimeEvent>;

const Home = () => {
  const events = useEvents();
  const discoveryEvents = useDiscoveryEvents();
  const groups = useGroups();
  const [searchParams] = useSearchParams();
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const searchQuery = searchParams.get("search") || "";
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const nextWeek = useMemo(() => addDays(now, 7), [now]);

  console.log(discoveryEvents, events);

  // Get events that are in discovery and their display priorities
  const discoveryEventMap = useMemo(() => {
    return new Map(
      discoveryEvents.map((de) => [de.eventId, de.displayPriority])
    );
  }, [discoveryEvents]);

  // Split events into upcoming week and other events
  const { upcomingWeekEvents, otherEvents } = useMemo(() => {
    const upcoming = events
      .filter((event) => {
        const eventDate = toUserTimezoneDate(event.startTime);
        const eventEndDate = toUserTimezoneDate(event.endTime);
        const yesterday = addDays(now, -1);
        return (
          isAfter(eventDate, yesterday) &&
          isBefore(eventDate, nextWeek) &&
          isAfter(eventEndDate, now)
        );
      })
      .sort(
        (a, b) =>
          toUserTimezoneDate(a.startTime).getTime() -
          toUserTimezoneDate(b.startTime).getTime()
      );

    const others = events.filter((event) => {
      const eventDate = toUserTimezoneDate(event.startTime);
      return isAfter(eventDate, nextWeek);
    });

    return { upcomingWeekEvents: upcoming, otherEvents: others };
  }, [events, nextWeek, now]);

  // Create a map of group IDs to group names for efficient lookup
  const groupMap = useMemo(() => {
    const map = new Map();
    groups.forEach((group) => {
      map.set(group.groupId, group.name);
    });
    return map;
  }, [groups]);

  // Filter other events by search query, then sort by display priority
  const filteredOtherEvents = useMemo(() => {
    let filtered = otherEvents;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        const groupName = groupMap.get(event.creatorGroupId);
        return (
          event.name.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          (groupName && groupName.toLowerCase().includes(query))
        );
      });
    }
    // Only show events that are in discovery and sort by display priority
    return filtered
      .filter((event) => discoveryEventMap.has(event.eventId))
      .sort((a, b) => {
        const priorityA = discoveryEventMap.get(a.eventId)!;
        const priorityB = discoveryEventMap.get(b.eventId)!;
        return Number(priorityA - priorityB);
      });
  }, [otherEvents, searchQuery, discoveryEventMap, groupMap]);

  const isLive = (event: EventType) => {
    const startDate = toUserTimezoneDate(event.startTime);
    const endDate = toUserTimezoneDate(event.endTime);

    return now >= startDate && now < endDate;
  };

  const navigate = useNavigate();

  const handleEventClick = (event: EventType) => {
    if (isLive(event)) {
      navigate(`/live-event/${event.eventId}`);
      return;
    }
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const getEventCountdown = (event: EventType) => {
    const startDate = toUserTimezoneDate(event.startTime);
    const endDate = toUserTimezoneDate(event.endTime);

    if (now >= endDate) return "ENDED";
    if (now >= startDate) return "LIVE";

    const remainingMs = startDate.getTime() - now.getTime();
    const minuteMs = 60_000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (remainingMs >= dayMs) {
      const daysLeft = Math.ceil(remainingMs / dayMs);
      return daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`;
    }

    if (remainingMs >= hourMs) {
      const hoursLeft = Math.ceil(remainingMs / hourMs);
      return `${hoursLeft} ${hoursLeft === 1 ? "HOUR" : "HOURS"}`;
    }

    const minutesLeft = Math.max(1, Math.ceil(remainingMs / minuteMs));
    return `${minutesLeft} ${minutesLeft === 1 ? "MIN" : "MINS"}`;
  };

  return (
    <div className="space-y-4 mx-4 my-2">
      {/* Upcoming Week Events */}
      <section>
        <h2 className="text-2xl font-bold mb-2">This Week</h2>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {upcomingWeekEvents.map((event) => (
            <div
              key={event.eventId}
              className="flex-shrink-0 w-[95%] sm:w-[47%] md:w-[31%] lg:w-[23.5%]"
              onClick={() => handleEventClick(event)}
            >
              <div className="relative">
                <EventCard event={event} />
                <div className="absolute top-1 right-2">
                  <Badge
                    variant={
                      getEventCountdown(event) === "LIVE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {getEventCountdown(event)}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other Events */}
      <section>
        <h2 className="text-2xl font-bold mb-3">Discover</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredOtherEvents.map((event) => (
            <div key={event.eventId} onClick={() => handleEventClick(event)}>
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </section>

      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
};

export default Home;

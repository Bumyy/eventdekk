import { useState, useMemo } from "react";
import { EventCard } from "@/components/EventCard";
import EventDialog from "@/components/EventDialog";
import { Event } from "@/module_bindings/event_type";
import {
  useEvents,
  useSubEvents,
  useDiscoveryEvents,
  useGroups,
} from "@/hooks/spacetimeHooks";
import { useSpacetime } from "@/components/SpacetimeProvider";
import {
  differenceInDays,
  differenceInHours,
  isAfter,
  isBefore,
  addDays,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { connection } = useSpacetime();
  const events = useEvents(connection);
  const subEvents = useSubEvents(connection);
  const discoveryEvents = useDiscoveryEvents(connection);
  const groups = useGroups(connection);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { now, nextWeek } = useMemo(() => {
    const currentDate = new Date();
    return {
      now: currentDate,
      nextWeek: addDays(currentDate, 7),
    };
  }, []);

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
        const eventDate = event.startTime.toDate();
        const yesterday = addDays(now, -1);
        return isAfter(eventDate, yesterday) && isBefore(eventDate, nextWeek);
      })
      .sort(
        (a, b) =>
          a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
      );

    const others = events.filter((event) => {
      const eventDate = event.startTime.toDate();
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

  // Filter other events by selected tag and search query, then sort by display priority
  const filteredOtherEvents = useMemo(() => {
    let filtered = otherEvents;
    if (selectedTag) {
      filtered = filtered.filter((event) => {
        const eventSubEvents = subEvents.filter(
          (se) => se.eventId === event.eventId
        );
        return eventSubEvents.some((se) => se.subEventType.tag === selectedTag);
      });
    }
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
  }, [
    otherEvents,
    selectedTag,
    searchQuery,
    subEvents,
    discoveryEventMap,
    groupMap,
  ]);

  const isLive = (event: Event) => {
    const now = new Date();
    const eventDate = event.startTime.toDate();
    const hoursSinceStart = differenceInHours(now, eventDate);
    return hoursSinceStart >= -12 && hoursSinceStart < 24;
  };

  const navigate = useNavigate();

  const handleEventClick = (event: Event) => {
    if (isLive(event)) {
      navigate(`/live-event/${event.eventId}`);
      return;
    }
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const getEventCountdown = (event: Event) => {
    const eventDate = event.startTime.toDate();
    const daysLeft = differenceInDays(eventDate, now);
    const hoursLeft = differenceInHours(eventDate, now);
    const hoursSinceStart = differenceInHours(eventDate, now);

    if (hoursSinceStart < 0 && hoursSinceStart >= -24) return "LIVE";
    if (daysLeft > 0)
      return `${daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`}`;
    if (hoursLeft > 0)
      return `${hoursLeft} ${hoursLeft === 1 ? "HOUR" : "HOURS"}`;
    return "ENDED";
  };

  const availableTags = ["GroupFlight", "FlyIn", "FlyOut"];

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
                        ? "destructive"
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold mr-4">Discover</h2>
            <div className="flex mt-1 gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedTag(selectedTag === tag ? null : tag)
                  }
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Input
            type="search"
            placeholder="Search events..."
            className="w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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

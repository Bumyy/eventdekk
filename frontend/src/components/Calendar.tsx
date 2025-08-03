import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday,
  addMonths,
  subMonths,
  areIntervalsOverlapping,
  isWithinInterval,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Event } from "@/module_bindings/event_type";
import { SubEvent } from "@/module_bindings/sub_event_type";
import EventDialog from "@/components/EventDialog";
import DayCalendarDialog from "@/components/DayCalendarDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGroups } from "@/hooks/spacetimeHooks";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSpacetime } from "@/components/SpacetimeProvider";

interface CalendarProps {
  events: Event[];
  subEvents?: SubEvent[];
}

const Calendar = ({ events, subEvents = [] }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  // Day calendar dialog
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);

  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get the start of the week for the first day of the month
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  // Get the end of the week for the last day of the month
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Get all days that should be displayed in the calendar grid
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Extract unique tags from events for the filter dropdown
  const eventTags = useMemo(() => {
    const tags = new Set<string>();

    events.forEach((event) => {
      // Here we're treating event types as tags
      tags.add(event.status.tag);
      // You could extract more tags from events if available
    });

    return Array.from(tags);
  }, [events]);

  // Filter events based on search query and selected tag
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !searchQuery ||
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !selectedTag || event.status.tag === selectedTag;

      return matchesSearch && matchesTag;
    });
  }, [events, searchQuery, selectedTag]);

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering day click
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleDayClick = (date: Date) => {
    const newSelectedDay = new Date(date); // Create a new Date object to avoid reference issues
    setSelectedDay(newSelectedDay);
    setShowDayDialog(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTag(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Add groups for displaying logos
  const { connection } = useSpacetime();
  const groups = useGroups(connection);

  // Get group info for avatar display
  const getGroupInfo = (groupId: bigint) => {
    const group = groups?.find((g) => g.groupId === groupId);
    return {
      name: group?.name || "Unknown Group",
      logo: group?.logoUrl || "",
      tag: group?.tag || "",
      color: group?.color || "#000000", // Add color to group info
    };
  };

  // Check if an event spans multiple days
  const isMultiDayEvent = (event: Event) => {
    const startDate = new Date(event.startTime.toDate());
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(event.endTime.toDate());
    endDate.setHours(23, 59, 59, 999);

    return endDate.getTime() - startDate.getTime() > 24 * 60 * 60 * 1000;
  };

  // Get all events that should appear on this day (including multi-day events)
  const getAllEventsForDay = (date: Date) => {
    return filteredEvents
      .filter((event) => {
        const eventStart = event.startTime.toDate();
        const eventEnd = event.endTime.toDate();
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Check if event overlaps with the day
        return (
          isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
          isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
          isWithinInterval(eventStart, { start: dayStart, end: dayEnd })
        );
      })
      .sort(
        (a, b) =>
          a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
      );
  };

  return (
    <>
      <div className="space-y-1">
        {/* Calendar Header with Month Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex">
              <Button
                variant="outline"
                size="sm"
                onClick={previousMonth}
                className="h-9 w-9 p-0 mr-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 h-9"
                onClick={goToToday}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-[200px]"
              />
            </div>

            <Select
              value={selectedTag || undefined}
              onValueChange={(value) => setSelectedTag(value || null)}
            >
              <SelectTrigger className="h-9 w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {eventTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || selectedTag) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Applied Filters */}
        {(searchQuery || selectedTag) && (
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                {searchQuery}
                <button onClick={() => setSearchQuery("")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedTag && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {selectedTag}
                <button onClick={() => setSelectedTag(null)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 ">
          {/* Weekday Headers */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {days.map((day) => {
            const dayEvents = getAllEventsForDay(day);
            const inCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[100px] px-1 border cursor-pointer transition-colors",
                  inCurrentMonth ? "bg-background" : "bg-muted/30",
                  isCurrentDay && "border-primary border-2",
                  !inCurrentMonth && "opacity-50",
                  hasEvents && inCurrentMonth && "hover:bg-primary/5"
                )}
                onClick={() => handleDayClick(day)}
              >
                <div
                  className={cn(
                    "font-medium mb-1 flex items-center justify-between",
                    isCurrentDay && "text-primary"
                  )}
                >
                  <span>{format(day, "d")}</span>
                  {dayEvents.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {dayEvents.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 max-h-[80px] overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const creatorGroup = getGroupInfo(event.creatorGroupId);

                    return (
                      <div
                        key={event.eventId.toString()}
                        className={cn(
                          "text-xs p-1 rounded hover:bg-primary/20 truncate transition-colors"
                        )}
                        style={{
                          backgroundColor: `${creatorGroup.color}20`, // Use the group's color with 20% opacity
                          borderLeft: `3px solid ${creatorGroup.color}`,
                        }}
                        onClick={(e) => handleEventClick(event, e)}
                        title={event.name}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium">
                            {format(event.startTime.toDate(), "HH:mm")}
                          </span>
                          <Avatar className="h-4 w-4">
                            <AvatarImage
                              src={creatorGroup.logo}
                              alt={creatorGroup.name}
                            />
                            <AvatarFallback className="text-[8px]">
                              {creatorGroup.tag ||
                                creatorGroup.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="truncate">{event.name}</div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Dialog */}
      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
        />
      )}

      {/* Day Calendar Dialog */}
      {selectedDay && (
        <DayCalendarDialog
          date={selectedDay}
          events={getAllEventsForDay(selectedDay)}
          subEvents={subEvents}
          groups={groups || []}
          open={showDayDialog}
          onOpenChange={setShowDayDialog}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setShowEventDialog(true);
          }}
          getAllEventsForDay={getAllEventsForDay}
        />
      )}
    </>
  );
};

export default Calendar;

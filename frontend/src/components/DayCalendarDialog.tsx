import { useState, useEffect, useMemo } from "react";
import {
  format,
  addDays,
  subDays,
  isSameDay,
  differenceInMinutes,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Group, Event, SubEvent } from "@/module_bindings";
import { cn } from "@/lib/utils";
import { areIntervalsOverlapping } from "date-fns";
import { Infer } from "spacetimedb";

type Event = Infer<typeof Event>;
type SubEvent = Infer<typeof SubEvent>;
type Group = Infer<typeof Group>;

interface DayCalendarDialogProps {
  date: Date;
  events: readonly Event[];
  subEvents?: readonly SubEvent[];
  groups: readonly Group[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (event: Event) => void;
  getAllEventsForDay: (date: Date) => Event[];
}

export default function DayCalendarDialog({
  date: initialDate,
  events: initialEvents,
  subEvents = [],
  groups = [],
  open,
  onOpenChange,
  onEventClick,
  getAllEventsForDay,
}: DayCalendarDialogProps) {
  // Update currentDate when initialDate changes to fix the day selection issue
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentEvents, setCurrentEvents] = useState<Event[]>([
    ...initialEvents,
  ]);

  useEffect(() => {
    if (initialDate) {
      setCurrentDate(new Date(initialDate));
      setCurrentEvents([...initialEvents]);
    }
  }, [initialDate, initialEvents]);

  // Navigate to previous day
  const goToPreviousDay = () => {
    const previousDay = subDays(currentDate, 1);
    setCurrentDate(previousDay);
    // Update events for the new day
    setCurrentEvents(getAllEventsForDay(previousDay));
  };

  // Navigate to next day
  const goToNextDay = () => {
    const nextDay = addDays(currentDate, 1);
    setCurrentDate(nextDay);
    // Update events for the new day
    setCurrentEvents(getAllEventsForDay(nextDay));
  };

  // Get sub-events for a specific event
  const getSubEventsForEvent = (eventId: bigint) => {
    console.log(
      "subEvents",
      subEvents.filter((se) => se.eventId === eventId)
    );
    return subEvents.filter((se) => se.eventId === eventId);
  };

  // Get group info for avatar display
  const getGroupInfo = (groupId: bigint) => {
    const group = groups.find((g) => g.groupId === groupId);
    return {
      name: group?.name || "Unknown Group",
      logo: group?.logoUrl || "",
      tag: group?.tag || "",
      color: group?.color || "#000000", // Add color property
    };
  };

  // Create an array of hours for the day timeline - reduced height for compactness
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Group events that occur at the same time
  const groupedEvents = useMemo(() => {
    const eventsWithOverlap: Array<{
      event: Event;
      column: number;
      totalColumns: number;
    }> = [];
    const sortedEvents = [...currentEvents].sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    );

    // Identify overlapping events and assign columns
    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      const currentStart = currentEvent.startTime.toDate();
      const currentEnd = currentEvent.endTime.toDate();

      // Find all events that overlap with the current event
      const overlappingEvents = sortedEvents.filter((event, idx) => {
        if (idx === i) return false; // Skip current event

        const eventStart = event.startTime.toDate();
        const eventEnd = event.endTime.toDate();

        return areIntervalsOverlapping(
          { start: currentStart, end: currentEnd },
          { start: eventStart, end: eventEnd }
        );
      });

      // If this event already has a column assigned, skip
      if (
        eventsWithOverlap.some((e) => e.event.eventId === currentEvent.eventId)
      ) {
        continue;
      }

      // Calculate total columns needed based on max overlapping events
      const maxOverlaps = overlappingEvents.length + 1;

      // Assign columns (0-based)
      let assignedColumn = 0;
      const usedColumns = new Set<number>();

      // Get columns used by already processed overlapping events
      overlappingEvents.forEach((event) => {
        const existingEvent = eventsWithOverlap.find(
          (e) => e.event.eventId === event.eventId
        );
        if (existingEvent) {
          usedColumns.add(existingEvent.column);
        }
      });

      // Find first available column
      while (usedColumns.has(assignedColumn)) {
        assignedColumn++;
      }

      // Add event with column info
      eventsWithOverlap.push({
        event: currentEvent,
        column: assignedColumn,
        totalColumns: maxOverlaps,
      });
    }

    return eventsWithOverlap;
  }, [currentEvents]);

  // Calculate event position and width for timeline display with proper overlap handling
  const calculateEventStyle = (
    event: Event,
    column: number,
    totalColumns: number
  ) => {
    const startTime = event.startTime.toDate();
    const endTime = event.endTime.toDate();
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);

    // Adjust start/end times for events that span multiple days
    let displayStart = startTime;
    let displayEnd = endTime;

    if (startTime < dayStart) {
      displayStart = dayStart;
    }

    if (endTime > dayEnd) {
      displayEnd = dayEnd;
    }

    // Calculate top position and height based on the visible part of the event
    const totalMinutesInDay = 24 * 60;
    const minutesSinceDayStart = differenceInMinutes(displayStart, dayStart);
    const visibleDurationMinutes = differenceInMinutes(
      displayEnd,
      displayStart
    );

    const topPercentage = (minutesSinceDayStart / totalMinutesInDay) * 100;
    const heightPercentage = (visibleDurationMinutes / totalMinutesInDay) * 100;

    // Calculate width and left position for overlapping events
    const widthPercentage = 100 / totalColumns;
    const leftPercentage = column * widthPercentage;

    return {
      top: `${topPercentage}%`,
      height: `${heightPercentage}%`,
      width: `${widthPercentage}%`,
      left: `${leftPercentage}%`,
      minHeight: "25px",
    };
  };

  // Determine if event spans multiple days
  const isMultiDayEvent = (event: Event) => {
    const startDate = startOfDay(event.startTime.toDate());
    const endDate = startOfDay(event.endTime.toDate());
    return !isSameDay(startDate, endDate);
  };

  // Determine if event starts on current day or continued from previous day
  const isEventStartingToday = (event: Event) => {
    return isSameDay(event.startTime.toDate(), currentDate);
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
        <DialogContent className="min-w-[70vw] min-h-[90vh] max-w-[90vw] max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="pt-6 pb-0 mb-0 gap-0">
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <DialogTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </DialogTitle>

              <Button variant="outline" size="icon" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-80px)] h-[70vh]">
            <div className="px-1 pb-6">
              {/* Day timeline view - made more compact */}
              <div className="relative mt-4 ml-14 mr-2 border-l h-[600px]">
                {" "}
                {/* Fixed height for compactness */}
                {/* Hour markers */}
                {hours.map((hour) => (
                  <div key={hour} className="flex items-center h-[25px] -ml-14">
                    {" "}
                    {/* Reduced height */}
                    <div className="w-12 text-right pr-2 text-xs text-muted-foreground">
                      {hour === 0
                        ? "12am"
                        : hour === 12
                          ? "12pm"
                          : hour > 12
                            ? `${hour - 12}pm`
                            : `${hour}am`}
                    </div>
                    <div className="flex-1 border-t relative">
                      {/* Hour line */}
                    </div>
                  </div>
                ))}
                {/* Events */}
                <div className="absolute inset-0 ml-14">
                  {groupedEvents.map(({ event, column, totalColumns }) => {
                    const style = calculateEventStyle(
                      event,
                      column,
                      totalColumns
                    );
                    const multiDay = isMultiDayEvent(event);
                    const startTime = event.startTime.toDate();
                    const endTime = event.endTime.toDate();
                    const creatorGroup = getGroupInfo(event.creatorGroupId);
                    const startsToday = isEventStartingToday(event);

                    return (
                      <div
                        key={`${event.eventId}-${column}`}
                        className={cn(
                          "absolute p-1 rounded-sm hover:z-10 hover:bg-primary/20 transition-colors cursor-pointer overflow-hidden"
                        )}
                        style={{
                          ...style,
                          backgroundColor: `${creatorGroup.color}20`,
                          borderLeft: `3px solid ${creatorGroup.color}`,
                          borderColor: `${creatorGroup.color}`,
                        }}
                        onClick={() => onEventClick(event)}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <Avatar className="h-3 w-3">
                              <AvatarImage
                                src={creatorGroup.logo}
                                alt={creatorGroup.name}
                              />
                              <AvatarFallback className="text-[6px]">
                                {creatorGroup.tag ||
                                  creatorGroup.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <h3 className="font-medium text-xs truncate max-w-[100px]">
                              {event.name}
                            </h3>
                          </div>
                          {multiDay && (
                            <Badge
                              variant="outline"
                              className="text-[8px] h-3 px-1"
                            >
                              {startsToday ? "Multi-day" : "Continued"}
                            </Badge>
                          )}
                        </div>

                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {format(startTime, "h:mm a")} -{" "}
                          {format(endTime, "h:mm a")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* No events message */}
              {currentEvents.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No events scheduled for this day
                </div>
              )}

              {/* List of events with details (more compact) */}
              <div className="mt-4 space-y-3">
                <h3 className="text-base font-medium flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Event Details
                </h3>

                <div className="space-y-2">
                  {currentEvents.map((event) => {
                    const startTime = event.startTime.toDate();
                    const endTime = event.endTime.toDate();
                    const creatorGroup = getGroupInfo(event.creatorGroupId);
                    const multiDay = isMultiDayEvent(event);

                    return (
                      <Card
                        key={event.eventId.toString()}
                        className="p-3 transition-colors cursor-pointer"
                        style={{
                          borderLeft: `4px solid ${creatorGroup.color}`,
                          // Set default background color with 10% opacity
                          backgroundColor: `${creatorGroup.color}10`,
                        }}
                        onClick={() => onEventClick(event)}
                        // Use CSS-in-JS for hover effect based on the dynamic color
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = `${creatorGroup.color}30`)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = `${creatorGroup.color}10`)
                        }
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage
                                  src={creatorGroup.logo}
                                  alt={creatorGroup.name}
                                />
                                <AvatarFallback className="text-[10px]">
                                  {creatorGroup.tag ||
                                    creatorGroup.name.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="font-semibold text-sm">
                                {event.name}
                              </h3>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {creatorGroup.name}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap text-xs"
                            >
                              {format(startTime, "h:mm a")} -{" "}
                              {format(endTime, "h:mm a")}
                            </Badge>

                            {multiDay && (
                              <Badge variant="secondary" className="text-xs">
                                Multi-day Event
                              </Badge>
                            )}
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {event.description}
                          </p>
                        )}

                        {/* Only show sub-events if they exist and if expanded */}
                        {getSubEventsForEvent(event.eventId).length > 0 && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {getSubEventsForEvent(event.eventId).length}{" "}
                              sub-events
                            </Badge>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addDays, addHours, differenceInCalendarDays, format } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useUserTimezone } from "@/utils/timezoneUtils";
import {
  WeeklyCalendarCategory,
  WeeklyCalendarLegend,
} from "./WeeklyCalendarLegend";

export interface AdminWeeklyCalendarEvent {
  id: string;
  name: string;
  start: Date;
  end: Date;
  category: WeeklyCalendarCategory;
  canEdit?: boolean;
}

interface AdminWeeklyCalendarProps {
  events: AdminWeeklyCalendarEvent[];
  allEventsForInsights: Array<{ start: Date; end: Date }>;
  onScheduleSuggestion: (start: Date, end: Date) => void;
  onEventClick?: (event: AdminWeeklyCalendarEvent) => void;
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slotStartHours = [9, 12, 15, 18, 21];
const slotLabels = [
  "Morning",
  "Midday",
  "Afternoon",
  "Evening",
  "Late",
] as const;
const preferredSlotOrder = [2, 3, 1, 4, 0];

const getSlotIndex = (hour: number) => {
  if (hour >= 9 && hour < 12) return 0;
  if (hour >= 12 && hour < 15) return 1;
  if (hour >= 15 && hour < 18) return 2;
  if (hour >= 18 && hour < 21) return 3;
  return 4;
};

const categoryColors: Record<
  WeeklyCalendarCategory,
  { bg: string; border: string }
> = {
  internal: { bg: "bg-emerald-500/20", border: "border-emerald-500" },
  hostingExternal: { bg: "bg-sky-500/20", border: "border-sky-500" },
  attendingExternal: { bg: "bg-amber-500/20", border: "border-amber-500" },
};

interface EventLayout {
  event: AdminWeeklyCalendarEvent;
  lane: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
}

const formatTimeInTz = (date: Date, timezone: string) => {
  return date.toLocaleTimeString(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateInTz = (date: Date, timezone: string) => {
  return date.toLocaleDateString(undefined, {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getDayKey = (date: Date, tz: string) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export function AdminWeeklyCalendar({
  events,
  allEventsForInsights,
  onScheduleSuggestion,
  onEventClick,
}: AdminWeeklyCalendarProps) {
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const timezone = useUserTimezone();

  const weekDayKeys = useMemo(() => {
    const tzStr = getDayKey(anchorDate, timezone);
    const [year, month, day] = tzStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(year, month - 1, day - diff + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    });
  }, [anchorDate, timezone]);

  const weekDays = useMemo(() => {
    return weekDayKeys.map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
  }, [weekDayKeys]);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const eventsWithLayout = useMemo(() => {
    const layout: EventLayout[] = [];
    const eventLanes: Map<string, number> = new Map();
    const occupiedLanes: Map<string, Set<number>> = new Map();

    weekDayKeys.forEach((key) => {
      occupiedLanes.set(key, new Set());
    });

    const eventsByStart = [...events].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );

    for (const event of eventsByStart) {
      const eventStartDayKey = getDayKey(event.start, timezone);
      const eventEndDayKey = getDayKey(event.end, timezone);

      let startDayIndex = -1;
      let endDayIndex = -1;

      for (let i = 0; i < weekDayKeys.length; i++) {
        if (eventStartDayKey === weekDayKeys[i] && startDayIndex === -1) {
          startDayIndex = i;
        }
        if (eventEndDayKey === weekDayKeys[i]) {
          endDayIndex = i;
        }
      }

      if (startDayIndex === -1 && eventStartDayKey < weekDayKeys[0]) {
        startDayIndex = 0;
      }
      if (endDayIndex === -1 && eventEndDayKey > weekDayKeys[6]) {
        endDayIndex = 6;
      }

      if (startDayIndex === -1 && endDayIndex === -1) {
        continue; // Event is entirely outside the week
      }

      if (startDayIndex === -1) startDayIndex = 0;
      if (endDayIndex === -1) endDayIndex = 6;

      const span = endDayIndex - startDayIndex + 1;

      let lane = 0;
      let found = false;

      while (!found && lane < 10) {
        let canUse = true;
        for (
          let d = startDayIndex;
          d <= endDayIndex && d < weekDayKeys.length;
          d++
        ) {
          const lanes = occupiedLanes.get(weekDayKeys[d]);
          if (lanes?.has(lane)) {
            canUse = false;
            break;
          }
        }
        if (canUse) {
          found = true;
        } else {
          lane++;
        }
      }

      eventLanes.set(event.id, lane);

      for (
        let d = startDayIndex;
        d <= endDayIndex && d < weekDayKeys.length;
        d++
      ) {
        occupiedLanes.get(weekDayKeys[d])?.add(lane);
      }

      layout.push({
        event,
        lane,
        span,
        isStart: eventStartDayKey >= weekDayKeys[0],
        isEnd: eventEndDayKey <= weekDayKeys[6],
      });
    }

    return layout;
  }, [events, weekDayKeys, timezone]);

  const maxLanes = useMemo(() => {
    let max = 1;
    eventsWithLayout.forEach((l) => {
      if (l.lane + 1 > max) max = l.lane + 1;
    });
    return Math.min(max, 5);
  }, [eventsWithLayout]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, AdminWeeklyCalendarEvent[]>();

    weekDayKeys.forEach((key) => {
      grouped.set(key, []);
    });

    events.forEach((event) => {
      const startKey = getDayKey(event.start, timezone);
      const endKey = getDayKey(event.end, timezone);

      weekDayKeys.forEach((key) => {
        if (key >= startKey && key <= endKey) {
          const items = grouped.get(key);
          if (items) items.push(event);
        }
      });
    });

    for (const [key, dayEvents] of grouped.entries()) {
      grouped.set(
        key,
        dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
      );
    }

    return grouped;
  }, [events, weekDayKeys, timezone]);

  const suggestedSlotsByDay = useMemo(() => {
    // We generate a timezone-aware "today" to calculate daysAhead
    const todayStr = getDayKey(new Date(), timezone);
    const [tY, tM, tD] = todayStr.split("-").map(Number);
    const today = new Date(tY, tM - 1, tD);

    const rankedCandidates = weekDays
      .map((day, index) => {
        const key = weekDayKeys[index];
        const dayEvents = eventsByDay.get(key) || [];
        const daysAhead = differenceInCalendarDays(day, today);

        if (dayEvents.length > 0 || daysAhead < 1) return null;

        const globalDayCount = allEventsForInsights.filter((event) => {
          const sKey = getDayKey(event.start, timezone);
          const eKey = getDayKey(event.end, timezone);
          return key >= sKey && key <= eKey;
        }).length;

        const slotCounts = [0, 0, 0, 0, 0];
        for (const event of allEventsForInsights) {
          const sKey = getDayKey(event.start, timezone);
          if (sKey === key) {
            const hourStr = new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              hour: "numeric",
              hour12: false,
            }).format(event.start);
            slotCounts[getSlotIndex(parseInt(hourStr, 10))] += 1;
          }
        }

        const lowestCount = Math.min(...slotCounts);
        const bestSlotIndex =
          preferredSlotOrder.find(
            (slotIndex) => slotCounts[slotIndex] === lowestCount
          ) ?? 2;

        const [y, m, d] = key.split("-").map(Number);
        const hour = slotStartHours[bestSlotIndex];

        const start = new Date();
        start.setFullYear(y, m - 1, d);
        start.setHours(hour, 0, 0, 0);

        return {
          key,
          start,
          end: addHours(start, 2),
          daysAhead,
          globalDayCount,
          preferredBucket: daysAhead >= 2 && daysAhead <= 3 ? 0 : 1,
          slotLabel: slotLabels[bestSlotIndex],
        };
      })
      .filter(
        (candidate): candidate is NonNullable<typeof candidate> => !!candidate
      )
      .sort(
        (a, b) =>
          a.preferredBucket - b.preferredBucket ||
          a.globalDayCount - b.globalDayCount ||
          a.daysAhead - b.daysAhead
      )
      .slice(0, 3);

    const map = new Map<
      string,
      { start: Date; end: Date; slotLabel: (typeof slotLabels)[number] }
    >();
    rankedCandidates.forEach((candidate) => {
      map.set(candidate.key, {
        start: candidate.start,
        end: candidate.end,
        slotLabel: candidate.slotLabel,
      });
    });

    return map;
  }, [allEventsForInsights, eventsByDay, weekDays, weekDayKeys, timezone]);

  const renderTimeDisplay = (event: AdminWeeklyCalendarEvent) => {
    const startStr = formatTimeInTz(event.start, timezone);
    const endStr = formatTimeInTz(event.end, timezone);

    const startDayKey = getDayKey(event.start, timezone);
    const endDayKey = getDayKey(event.end, timezone);

    if (startDayKey === endDayKey) {
      return `${startStr} - ${endStr}`;
    }

    const startDateStr = formatDateInTz(event.start, timezone);
    const endDateStr = formatDateInTz(event.end, timezone);

    return `${startDateStr}, ${startStr} - ${endDateStr}, ${endStr}`;
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Weekly Calendar</h2>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchorDate((prev) => addDays(prev, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setAnchorDate(new Date())}>
            This Week
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchorDate((prev) => addDays(prev, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <WeeklyCalendarLegend className="mt-4" />

      <div className="mt-4 overflow-x-auto">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(7, minmax(120px, 1fr))`,
            minHeight: `${Math.max(200, maxLanes * 40 + 80)}px`,
          }}
        >
          {weekDays.map((day, index) => {
            const key = weekDayKeys[index];
            const dayEvents = eventsByDay.get(key) || [];
            const daySuggestion = suggestedSlotsByDay.get(key);
            const isToday = getDayKey(new Date(), timezone) === key;

            return (
              <div
                key={key}
                className="border-r border-b border-t last:border-r-0 first:rounded-l-lg last:rounded-r-lg"
              >
                <div
                  className={`px-3 py-2 border-b ${isToday ? "bg-primary/10" : "bg-muted/30"}`}
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {weekdayLabels[index]}
                  </p>
                  <p
                    className={`text-lg font-semibold leading-tight ${isToday ? "text-primary" : ""}`}
                  >
                    {format(day, "d")}
                  </p>
                </div>

                <div
                  className="relative min-h-[160px]"
                  style={{ height: `${Math.max(160, maxLanes * 40 + 40)}px` }}
                >
                  {eventsWithLayout
                    .filter((l) => {
                      const eventStartDay = getDayKey(l.event.start, timezone);
                      const eventEndDay = getDayKey(l.event.end, timezone);
                      return key >= eventStartDay && key <= eventEndDay;
                    })
                    .map((layout) => {
                      const eventStartDayKey = getDayKey(
                        layout.event.start,
                        timezone
                      );
                      const eventEndDayKey = getDayKey(
                        layout.event.end,
                        timezone
                      );
                      const isEventStart = eventStartDayKey === key;
                      const isEventEnd = eventEndDayKey === key;
                      const isClickable =
                        !!layout.event.canEdit && !!onEventClick;
                      const colors = categoryColors[layout.event.category];

                      const segmentSpacingClass =
                        isEventStart && isEventEnd
                          ? "left-1 right-1 rounded-md"
                          : isEventStart
                            ? "left-1 right-0 rounded-l-md rounded-r-none"
                            : isEventEnd
                              ? "left-0 right-1 rounded-r-md rounded-l-none"
                              : "left-0 right-0 rounded-none";

                      const segmentBorderClass = isEventStart
                        ? `border-l-2 ${colors.border}`
                        : "border-l-0";

                      return (
                        <div
                          key={`${key}-${layout.event.id}`}
                          className={`absolute ${segmentSpacingClass} ${colors.bg} ${segmentBorderClass} px-2 py-1 transition-opacity ${isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                          style={{
                            top: `${layout.lane * 40 + 8}px`,
                            height: "36px",
                          }}
                          onClick={() => {
                            if (!isClickable) return;
                            onEventClick(layout.event);
                          }}
                          onKeyDown={(e) => {
                            if (!isClickable) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onEventClick(layout.event);
                            }
                          }}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : -1}
                          title={`${layout.event.name}\n${renderTimeDisplay(layout.event)}`}
                        >
                          {isEventStart && (
                            <>
                              <p className="text-xs font-medium truncate leading-tight">
                                {layout.event.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                {isEventEnd
                                  ? formatTimeInTz(layout.event.start, timezone)
                                  : `${formatTimeInTz(layout.event.start, timezone)} \u2192`}
                              </p>
                            </>
                          )}
                          {!isEventStart && isEventEnd && (
                            <p className="text-xs text-muted-foreground truncate">
                              {`← ${formatTimeInTz(layout.event.end, timezone)}`}
                            </p>
                          )}
                          {!isEventStart && !isEventEnd && (
                            <p className="text-xs text-muted-foreground truncate">
                              {layout.event.name}
                            </p>
                          )}
                        </div>
                      );
                    })}

                  {dayEvents.length === 0 && daySuggestion && (
                    <div className="absolute inset-x-2 top-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-auto py-1 text-xs"
                        onClick={() =>
                          onScheduleSuggestion(
                            daySuggestion.start,
                            daySuggestion.end
                          )
                        }
                      >
                        <CalendarPlus className="h-3 w-3 mr-1" />
                        {format(daySuggestion.start, "h:mm a")}
                      </Button>
                    </div>
                  )}

                  {dayEvents.length === 0 && !daySuggestion && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground/50">
                        No events
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

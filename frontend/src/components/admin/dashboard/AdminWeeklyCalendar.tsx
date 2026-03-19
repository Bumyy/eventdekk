import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  addDays,
  addHours,
  differenceInCalendarDays,
  endOfWeek,
  format,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { WeeklyCalendarEventItem } from "./WeeklyCalendarEventItem";
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
}

interface AdminWeeklyCalendarProps {
  events: AdminWeeklyCalendarEvent[];
  allEventsForInsights: Array<{ start: Date; end: Date }>;
  onScheduleSuggestion: (start: Date, end: Date) => void;
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

export function AdminWeeklyCalendar({
  events,
  allEventsForInsights,
  onScheduleSuggestion,
}: AdminWeeklyCalendarProps) {
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  const weekStart = useMemo(
    () => startOfWeek(anchorDate, { weekStartsOn: 1 }),
    [anchorDate]
  );
  const weekEnd = useMemo(() => endOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, AdminWeeklyCalendarEvent[]>();

    weekDays.forEach((day) => {
      grouped.set(format(day, "yyyy-MM-dd"), []);
    });

    events.forEach((event) => {
      const eventStart = event.start;
      const eventEnd = event.end;

      weekDays.forEach((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);

        const overlapsDay = eventStart < dayEnd && eventEnd >= dayStart;

        if (!overlapsDay) return;

        const key = format(day, "yyyy-MM-dd");
        const items = grouped.get(key);
        if (!items) return;
        items.push(event);
      });
    });

    for (const [key, dayEvents] of grouped.entries()) {
      grouped.set(
        key,
        dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
      );
    }

    return grouped;
  }, [events, weekDays]);

  const suggestedSlotsByDay = useMemo(() => {
    const today = startOfDay(new Date());

    const rankedCandidates = weekDays
      .map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = eventsByDay.get(key) || [];
        const daysAhead = differenceInCalendarDays(day, today);

        if (dayEvents.length > 0 || daysAhead < 1) return null;

        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);
        const globalDayCount = allEventsForInsights.filter(
          (event) => event.start < dayEnd && event.end >= dayStart
        ).length;

        const slotCounts = [0, 0, 0, 0, 0];
        for (const event of allEventsForInsights) {
          if (event.start.getDay() !== day.getDay()) continue;
          slotCounts[getSlotIndex(event.start.getHours())] += 1;
        }

        const lowestCount = Math.min(...slotCounts);
        const bestSlotIndex =
          preferredSlotOrder.find((slotIndex) => slotCounts[slotIndex] === lowestCount) ??
          2;

        const start = setMilliseconds(
          setSeconds(
            setMinutes(
              setHours(startOfDay(day), slotStartHours[bestSlotIndex]),
              0
            ),
            0
          ),
          0
        );

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
      .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate)
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
  }, [allEventsForInsights, eventsByDay, weekDays]);

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

      <ScrollArea className="mt-4 w-full">
        <div className="grid min-w-[840px] grid-cols-7 gap-3 pb-1">
          {weekDays.map((day, index) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) || [];
            const daySuggestion = suggestedSlotsByDay.get(key);

            return (
              <div
                key={key}
                className="rounded-lg border bg-card/60 p-3 shadow-sm min-h-[220px]"
              >
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {weekdayLabels[index]}
                  </p>
                  <p className="text-lg font-semibold leading-tight">
                    {format(day, "d")}
                  </p>
                </div>

                {dayEvents.length > 0 ? (
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <WeeklyCalendarEventItem
                        key={`${key}-${event.id}`}
                        name={event.name}
                        start={event.start}
                        end={event.end}
                        category={event.category}
                      />
                    ))}
                  </div>
                ) : daySuggestion ? (
                  <Button
                    variant="outline"
                    className="h-8 w-full justify-start gap-1 px-2 text-xs"
                    onClick={() => onScheduleSuggestion(daySuggestion.start, daySuggestion.end)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Add {format(daySuggestion.start, "h:mm a")}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">No events</p>
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}

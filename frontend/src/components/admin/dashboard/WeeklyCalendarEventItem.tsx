import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { WeeklyCalendarCategory } from "./WeeklyCalendarLegend";

interface WeeklyCalendarEventItemProps {
  name: string;
  start: Date;
  end: Date;
  category: WeeklyCalendarCategory;
}

const categoryClassMap: Record<WeeklyCalendarCategory, string> = {
  internal: "border-emerald-500/60 bg-emerald-500/10",
  hostingExternal: "border-sky-500/60 bg-sky-500/10",
  attendingExternal: "border-amber-500/60 bg-amber-500/10",
};

export function WeeklyCalendarEventItem({
  name,
  start,
  end,
  category,
}: WeeklyCalendarEventItemProps) {
  return (
    <div
      className={`rounded-md border-l-4 p-2 transition-colors ${categoryClassMap[category]}`}
      title={name}
    >
      <p className="truncate text-sm font-medium">{name}</p>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>
          {format(start, "HH:mm")} - {format(end, "HH:mm")}
        </span>
      </div>
    </div>
  );
}

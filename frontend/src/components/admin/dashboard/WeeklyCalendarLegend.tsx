import { Badge } from "@/components/ui/badge";

export type WeeklyCalendarCategory =
  | "internal"
  | "hostingExternal"
  | "attendingExternal";

const categoryConfig: Record<
  WeeklyCalendarCategory,
  { label: string; dotClassName: string }
> = {
  internal: {
    label: "Internal",
    dotClassName: "bg-emerald-500",
  },
  hostingExternal: {
    label: "Hosting (External)",
    dotClassName: "bg-sky-500",
  },
  attendingExternal: {
    label: "Attending (External)",
    dotClassName: "bg-amber-500",
  },
};

interface WeeklyCalendarLegendProps {
  className?: string;
}

export function WeeklyCalendarLegend({ className }: WeeklyCalendarLegendProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {(
          Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>
        ).map((category) => {
          const config = categoryConfig[category];

          return (
            <Badge
              key={category}
              variant="outline"
              className="inline-flex items-center gap-2"
            >
              <span
                className={`h-2 w-2 rounded-full ${config.dotClassName}`}
                aria-hidden="true"
              />
              {config.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

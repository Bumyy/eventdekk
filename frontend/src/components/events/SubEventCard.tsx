import { CalendarDays, Clock3, Users } from "lucide-react";
import { Infer } from "spacetimedb";
import { SubEvent, SubEventType } from "@/module_bindings/types";
import { Badge } from "@/components/ui/badge";
import { formatInTimezone, formatTimeInTimezone } from "@/utils/timezoneUtils";

type SubEventTypeType = Infer<typeof SubEvent>;

interface SubEventCardProps {
  subEvent: SubEventTypeType;
  signupCount: number;
  userTimezone: string;
  mainEventStartTime: Date;
  onClick?: () => void;
}

function getSubEventTypeBadge(type: SubEventType) {
  if (type.tag === "GroupFlight") {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        Group Flight
      </Badge>
    );
  }

  if (type.tag === "FlyIn") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        Fly-in
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      Fly-out
    </Badge>
  );
}

function getRouteElement(subEvent: SubEventTypeType) {
  if (
    subEvent.subEventType.tag === "GroupFlight" &&
    subEvent.groupFlightDepartureIcao &&
    subEvent.groupFlightArrivalIcao
  ) {
    return (
      <span className="inline-flex items-center gap-2">
        <span>{subEvent.groupFlightDepartureIcao}</span>
        <span className="text-muted-foreground">→</span>
        <span>{subEvent.groupFlightArrivalIcao}</span>
      </span>
    );
  }

  if (subEvent.hubIcao) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="tracking-wide">{subEvent.hubIcao}</span>
      </span>
    );
  }

  return null;
}

export function SubEventCard({
  subEvent,
  signupCount,
  userTimezone,
  mainEventStartTime,
  onClick,
}: SubEventCardProps) {
  const subEventStart = subEvent.scheduledStartTime.toDate();
  const subEventEnd = subEvent.scheduledEndTime.toDate();
  const isSameAsMainEventDay =
    formatInTimezone(subEventStart, userTimezone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }) ===
    formatInTimezone(mainEventStartTime, userTimezone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  const routeElement = getRouteElement(subEvent);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
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
          {signupCount}
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
            {formatTimeInTimezone(subEventStart, userTimezone)} -{" "}
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
}

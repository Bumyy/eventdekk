import { Users } from "lucide-react";
import { Infer } from "spacetimedb";
import {
  SubEvent,
  Group,
  FlightSignup,
  SubEventType,
} from "@/module_bindings/types";
import { Badge } from "@/components/ui/badge";
import { formatInTimezone, formatTimeInTimezone } from "@/utils/timezoneUtils";
import { ParticipantList } from "./ParticipantList";

type SubEventTypeType = Infer<typeof SubEvent>;

interface SubEventDetailsProps {
  subEvent: SubEventTypeType;
  signups: FlightSignup[];
  groups: Group[];
  userTimezone: string;
  isHighlighted?: boolean;
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
    return <span className="tracking-wide">{subEvent.hubIcao}</span>;
  }

  return null;
}

export function SubEventDetails({
  subEvent,
  signups,
  groups,
  userTimezone,
  isHighlighted = false,
}: SubEventDetailsProps) {
  const routeElement = getRouteElement(subEvent);

  return (
    <article
      className={`rounded-2xl border bg-card px-4 py-4 sm:px-5 transition-shadow ${
        isHighlighted ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>{getSubEventTypeBadge(subEvent.subEventType)}</div>
          <h4 className="text-base sm:text-lg font-semibold leading-tight">
            {subEvent.name}
          </h4>
          <Badge variant="outline" className="ml-auto">
            <Users className="mr-1 h-3 w-3" />
            {signups.length}
          </Badge>
        </div>

        <div className="rounded-xl border bg-muted/25 px-3 py-3">
          <p className="text-base font-semibold leading-tight">
            {formatInTimezone(subEvent.scheduledStartTime, userTimezone, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {formatTimeInTimezone(subEvent.scheduledStartTime, userTimezone)} -{" "}
            {formatTimeInTimezone(subEvent.scheduledEndTime, userTimezone)}
          </p>
          {routeElement && (
            <p className="mt-2 text-base sm:text-lg font-semibold tracking-tight">
              {routeElement}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {subEvent.description}
        </p>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Who joined this sub-event
          </p>
          <ParticipantList
            signups={signups}
            groups={groups}
            subEventType={subEvent.subEventType}
            hubIcao={subEvent.hubIcao}
          />
        </div>
      </div>
    </article>
  );
}

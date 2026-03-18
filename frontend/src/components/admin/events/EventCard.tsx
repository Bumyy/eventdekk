import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Plane,
  Users,
  Send,
  AlertTriangle,
  UserCircle,
} from "lucide-react";
import {
  SubEventType,
  Event,
  SubEvent,
  EventStatus,
} from "@/module_bindings/types";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FlightSignupInfo {
  groupId: bigint;
  subEventId: bigint;
}

interface EventCardProps {
  event: Event;
  subEvents: SubEvent[];
  userTimezone: string;
  groupId?: bigint;
  isHosting?: boolean;
  isAttending?: boolean;
  participatingCount?: number;
  creatorGroupInfo?: {
    name: string;
    logo: string;
    tag: string;
  };
  expanded?: boolean;
  flightSignups?: FlightSignupInfo[];
  currentUser?: any;
  users?: any[];
  onToggleExpand?: () => void;
  onManage?: () => void;
  onDelete?: () => void;
  onManageParticipation?: () => void;
  onPublish?: () => void;
}

function getEventTypeBadge(type: SubEventType) {
  switch (type.tag) {
    case "GroupFlight":
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Group Flight
        </Badge>
      );
    case "FlyIn":
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Fly-in
        </Badge>
      );
    case "FlyOut":
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Fly-out
        </Badge>
      );
  }
}

export function EventCard({
  event,
  subEvents,
  userTimezone,
  isHosting = false,
  isAttending = false,
  participatingCount,
  creatorGroupInfo,
  expanded = false,
  flightSignups = [],
  users = [],
  currentUser,
  onToggleExpand,
  onManage,
  onDelete,
  onManageParticipation,
  onPublish,
}: EventCardProps) {
  const isDraft = event.status?.tag === "Draft";

  const missingLeadsCount = isHosting
    ? subEvents.filter((se) => !se.eventLead).length
    : 0;

  const isUserLeadForThisEvent =
    currentUser &&
    subEvents.some(
      (se) =>
        se.eventLead &&
        se.eventLead.toHexString() === currentUser.identity.toHexString()
    );

  return (
    <Card
      className={`p-4 transition-colors ${isUserLeadForThisEvent ? "border-secondary bg-secondary/5" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            {isDraft && <Badge variant="outline">Draft</Badge>}
            {isHosting && missingLeadsCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {missingLeadsCount} Missing Lead
                {missingLeadsCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {isUserLeadForThisEvent && (
              <Badge
                variant="default"
                className="bg-blue-600 text-white flex items-center gap-1"
              >
                <UserCircle className="h-3 w-3" />
                You are Lead
              </Badge>
            )}
            {isHosting && (
              <Badge variant="outline">{subEvents.length} Sub-events</Badge>
            )}
            {isAttending && (
              <>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Attending
                </Badge>
                <Badge variant="secondary">
                  {participatingCount} of {subEvents.length} sub-events
                </Badge>
              </>
            )}
          </div>
          <p className="text-muted-foreground">{event.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatDateInTimezone(event.startTime, userTimezone)}</span>
            <span>•</span>
            <span>{formatTimeInTimezone(event.startTime, userTimezone)}</span>
            {isAttending && creatorGroupInfo && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <span>Hosted by:</span>
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={creatorGroupInfo.logo}
                      alt={creatorGroupInfo.name}
                    />
                    <AvatarFallback className="text-xs">
                      {creatorGroupInfo.tag ||
                        creatorGroupInfo.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{creatorGroupInfo.name}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onToggleExpand && (
            <Button variant="ghost" size="icon" onClick={onToggleExpand}>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
          {isHosting && (
            <>
              {isDraft && onPublish && (
                <Button variant="default" onClick={onPublish}>
                  <Send className="h-4 w-4 mr-1" />
                  Publish
                </Button>
              )}
              {onManage && (
                <Button variant="outline" onClick={onManage}>
                  Manage
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" onClick={onDelete}>
                  Delete
                </Button>
              )}
            </>
          )}
          {isAttending && onManageParticipation && (
            <Button variant="outline" onClick={onManageParticipation}>
              Manage Participation
            </Button>
          )}
        </div>
      </div>

      {expanded && subEvents.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Sub Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subEvents.map((subEvent) => {
              const isParticipating = flightSignups.some(
                (signup) => signup.subEventId === subEvent.subEventId
              );
              const isThisSubEventMine =
                currentUser &&
                subEvent.eventLead &&
                subEvent.eventLead.toHexString() ===
                  currentUser.identity.toHexString();
              const hasNoLead = !subEvent.eventLead;
              const leadUser = subEvent.eventLead
                ? users.find(
                    (u) =>
                      u.identity.toHexString() ===
                      subEvent.eventLead.toHexString()
                  )
                : null;

              return (
                <Card
                  key={subEvent.subEventId}
                  className={`p-4 transition-all ${
                    isThisSubEventMine
                      ? "border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                      : hasNoLead && isHosting
                        ? "border-2 border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10"
                        : isParticipating
                          ? "border-2 border-primary"
                          : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    {getEventTypeBadge(subEvent.subEventType)}
                    {isParticipating && (
                      <Badge variant="secondary">Registered</Badge>
                    )}
                  </div>
                  <h4 className="font-medium">{subEvent.name}</h4>

                  <div className="mt-1 mb-2 text-xs">
                    {hasNoLead ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3 w-3" /> No Lead Assigned
                      </span>
                    ) : (
                      <span
                        className={`flex items-center gap-1 ${isThisSubEventMine ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground"}`}
                      >
                        <UserCircle className="h-3 w-3" />
                        {isThisSubEventMine
                          ? "You are Leading"
                          : `Lead: ${leadUser?.displayName || "Unknown"}`}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {subEvent.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {formatDateInTimezone(
                        subEvent.scheduledStartTime,
                        userTimezone
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      {formatTimeInTimezone(
                        subEvent.scheduledStartTime,
                        userTimezone
                      )}
                    </span>
                    {subEvent.subEventType.tag === "GroupFlight" &&
                      subEvent.groupFlightDepartureIcao &&
                      subEvent.groupFlightArrivalIcao && (
                        <>
                          <span>•</span>
                          <span>
                            {subEvent.groupFlightDepartureIcao} →{" "}
                            {subEvent.groupFlightArrivalIcao}
                          </span>
                        </>
                      )}
                    {subEvent.subEventType.tag === "FlyIn" &&
                      subEvent.hubIcao && (
                        <>
                          <span>•</span>
                          <span>To: {subEvent.hubIcao}</span>
                        </>
                      )}
                    {subEvent.subEventType.tag === "FlyOut" &&
                      subEvent.hubIcao && (
                        <>
                          <span>•</span>
                          <span>From: {subEvent.hubIcao}</span>
                        </>
                      )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

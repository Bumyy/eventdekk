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
  onToggleExpand?: () => void;
  onManage?: () => void;
  onDelete?: () => void;
  onManageParticipation?: () => void;
  onPublish?: () => void;
  flightSignups?: FlightSignupInfo[];
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
  onToggleExpand,
  onManage,
  onDelete,
  onManageParticipation,
  onPublish,
  flightSignups = [],
}: EventCardProps) {
  const isDraft = event.status?.tag === "Draft";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            {isDraft && <Badge variant="outline">Draft</Badge>}
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

              return (
                <Card
                  key={subEvent.subEventId}
                  className={`p-4 ${
                    isParticipating ? "border-2 border-primary" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    {getEventTypeBadge(subEvent.subEventType)}
                    {isParticipating && (
                      <Badge variant="secondary">Registered</Badge>
                    )}
                  </div>
                  <h4 className="font-medium">{subEvent.name}</h4>
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

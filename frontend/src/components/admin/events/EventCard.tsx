import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Plane,
  Settings,
  Users,
  Send,
  Trash2,
  AlertTriangle,
  UserCircle,
  AlertCircle,
} from "lucide-react";
import {
  SubEventType,
  Event,
  SubEvent,
  FlightSignup,
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

interface SignupIssues {
  hasIssues: boolean;
  missingGroupLead: boolean;
  missingCallsign: boolean;
  missingAircraftType: boolean;
  missingDepartureTime: boolean;
  missingArrivalTime: boolean;
  missingDepartureIcao: boolean;
  missingArrivalIcao: boolean;
}

interface SignupWithIssues {
  signup: FlightSignup;
  subEvent: SubEvent | undefined;
  issues: SignupIssues | null;
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
    color?: string;
  };
  expanded?: boolean;
  flightSignups?: FlightSignup[];
  currentUser?: any;
  users?: any[];
  onToggleExpand?: () => void;
  onManage?: () => void;
  onDelete?: () => void;
  onManageParticipation?: () => void;
  onPublish?: () => void;
  onEventClick?: () => void;
  hasIncompleteInfo?: boolean;
  signupsWithIssues?: SignupWithIssues[];
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
  onEventClick,
  hasIncompleteInfo = false,
  signupsWithIssues = [],
}: EventCardProps) {
  const isDraft = event.status?.tag === "Draft";
  const hasBannerImage = Boolean(event.bannerUrl);

  const missingLeadsCount = isHosting
    ? subEvents.filter((se) => !se.eventLead).length
    : 0;

  const isUserLeadForThisEvent = currentUser
    ? isHosting
      ? subEvents.some(
          (se) =>
            se.eventLead &&
            se.eventLead.toHexString() === currentUser.identity.toHexString()
        )
      : signupsWithIssues.some(
          (entry) =>
            entry.signup.eventLead &&
            entry.signup.eventLead.toHexString() ===
              currentUser.identity.toHexString()
        )
    : false;

return (
    <Card
      className={`overflow-hidden p-0 transition-colors ${isUserLeadForThisEvent ? "border-secondary bg-secondary/5" : ""}${hasIncompleteInfo ? " border-amber-500/50" : ""}${onEventClick ? " cursor-pointer" : ""}`}
      onClick={onEventClick}
    >
      <div className="flex flex-col sm:flex-row">
        {hasBannerImage && (
          <div className="relative h-32 sm:h-auto sm:w-44 md:w-56 shrink-0">
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent sm:bg-gradient-to-b sm:from-black/50 sm:to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 text-white sm:hidden">
              <p className="text-sm font-semibold line-clamp-1">{event.name}</p>
            </div>
          </div>
        )}

        <div className="flex-1 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
            {isAttending && hasIncompleteInfo && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Incomplete Details
              </Badge>
            )}
            {isUserLeadForThisEvent && (
              <Badge
                variant="default"
                className="bg-blue-600 text-white flex items-center gap-1"
              >
                <UserCircle className="h-3 w-3" />
                {isHosting ? "You are Lead" : "You are Group Lead"}
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
          <p className="text-muted-foreground overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {event.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatDateInTimezone(event.startTime, userTimezone)}</span>
            <span>•</span>
            <span>{formatTimeInTimezone(event.startTime, userTimezone)}</span>
            {isAttending && creatorGroupInfo && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
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
            <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
{onToggleExpand && (
            <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onToggleExpand();}}>
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
                <Button variant="default" onClick={(e) => {e.stopPropagation(); onPublish();}}>
                  <Send className="h-4 w-4 mr-1" />
                  Publish
                </Button>
              )}
              {onManage && (
                <Button
                  variant="outline"
                  onClick={(e) => {e.stopPropagation(); onManage();}}
                  aria-label="Manage event"
                >
                  <Settings className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Manage</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={(e) => {e.stopPropagation(); onDelete();}}
                  aria-label="Delete event"
                >
                  <Trash2 className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </>
          )}
          {isAttending && onManageParticipation && (
            <Button
              variant="outline"
              onClick={(e) => {e.stopPropagation(); onManageParticipation();}}
              aria-label="Manage participation"
            >
              <Settings className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Manage Participation</span>
            </Button>
          )}
            </div>
          </div>
        </div>
      </div>

      {expanded && subEvents.length > 0 && (
        <div className="space-y-4 border-t px-4 pb-4 pt-4">
          <h3 className="text-lg font-semibold">Sub Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subEvents.map((subEvent) => {
              const isParticipating = flightSignups.some(
                (signup) => signup.subEventId === subEvent.subEventId
              );
              const signupWithIssue = signupsWithIssues.find(
                (s) => s.signup.subEventId === subEvent.subEventId
              );
              const signup = signupWithIssue?.signup;
              const signupIssues = signupWithIssue?.issues;
              const hasSignupIssues = signupIssues?.hasIssues || false;
              const isThisSubEventMine =
                currentUser &&
                subEvent.eventLead &&
                subEvent.eventLead.toHexString() ===
                  currentUser.identity.toHexString();
              const hasNoLead = !subEvent.eventLead;
              const subEventLeadUser = subEvent.eventLead
                ? users.find(
                    (u) =>
                      u.identity.toHexString() ===
                      subEvent.eventLead.toHexString()
                  )
                : null;
              const signupLeadUser = signup?.eventLead
                ? users.find(
                    (u) =>
                      u.identity.toHexString() ===
                      signup.eventLead!.toHexString()
                  )
                : null;

              return (
                <Card
                  key={subEvent.subEventId}
                  className={`p-4 transition-all ${
                    hasSignupIssues && isAttending
                      ? "border-2 border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10"
                      : isThisSubEventMine
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

                  <div className="mt-1 mb-2 text-xs space-y-1">
                    {isAttending && isParticipating ? (
                      <>
                        <span
                          className={`flex items-center gap-1 ${!signupLeadUser ? "text-amber-600 dark:text-amber-400 font-semibold" : signupLeadUser && currentUser && signupLeadUser.identity.toHexString() === currentUser.identity.toHexString() ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground"}`}
                        >
                          {!signupLeadUser ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <UserCircle className="h-3 w-3" />
                          )}
                          {signupLeadUser
                            ? `Your Group Lead: ${signupLeadUser.displayName || "Unknown"}`
                            : "Your Group Lead: Unassigned (required)"}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <UserCircle className="h-3 w-3" />
                          {hasNoLead
                            ? "Sub-event Lead: Unassigned"
                            : `Sub-event Lead: ${subEventLeadUser?.displayName || "Unknown"}`}
                        </span>
                      </>
                    ) : hasNoLead ? (
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
                          : `Lead: ${subEventLeadUser?.displayName || "Unknown"}`}
                      </span>
                    )}
                  </div>

                  {isAttending && (
                    <div className="mb-2 rounded-md border bg-muted/30 p-2 text-xs">
                      {isParticipating && signup ? (
                        <div className="space-y-1 text-muted-foreground">
                          <div>
                            Callsign:{" "}
                            <span className="font-medium text-foreground">
                              {signup.callsign || "Missing"}
                            </span>
                          </div>
                          <div>
                            Aircraft:{" "}
                            <span className="font-medium text-foreground">
                              {signup.aircraftType || "Missing"}
                            </span>
                          </div>
                          <div>
                            Route:{" "}
                            <span className="font-medium text-foreground">
                              {signup.routeDetails || "Not set"}
                            </span>
                          </div>
                          <div>
                            Departure:{" "}
                            <span className="font-medium text-foreground">
                              {signup.departureIcao || "-"}
                            </span>
                            {signup.desiredDepartureTime
                              ? ` at ${formatDateInTimezone(signup.desiredDepartureTime, userTimezone)} ${formatTimeInTimezone(signup.desiredDepartureTime, userTimezone)}`
                              : " at Missing time"}
                          </div>
                          <div>
                            Arrival:{" "}
                            <span className="font-medium text-foreground">
                              {signup.arrivalIcao || "-"}
                            </span>
                            {signup.desiredArrivalTime
                              ? ` at ${formatDateInTimezone(signup.desiredArrivalTime, userTimezone)} ${formatTimeInTimezone(signup.desiredArrivalTime, userTimezone)}`
                              : " at Missing time"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Not signed up for this sub-event.
                        </span>
                      )}
                    </div>
                  )}

                  {hasSignupIssues && signupIssues && isParticipating && (
                    <div className="mt-2 mb-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/20">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-xs">
                        <AlertCircle className="h-3 w-3" />
                        <span>Missing details:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {signupIssues.missingCallsign && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Callsign
                          </Badge>
                        )}
                        {signupIssues.missingGroupLead && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Group Lead
                          </Badge>
                        )}
                        {signupIssues.missingAircraftType && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Aircraft
                          </Badge>
                        )}
                        {signupIssues.missingDepartureTime && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Dep. Time
                          </Badge>
                        )}
                        {signupIssues.missingArrivalTime && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Arr. Time
                          </Badge>
                        )}
                        {signupIssues.missingDepartureIcao && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Dep. Airport
                          </Badge>
                        )}
                        {signupIssues.missingArrivalIcao && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-600"
                          >
                            Arr. Airport
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

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

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, AlertTriangle } from "lucide-react";
import { Event, SubEvent, Group } from "@/module_bindings/types";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";
import { useMemo } from "react";

interface GroupAvailabilityData {
  hostedEvents: Event[];
  attendingEvents: Event[];
  hostedSubEvents: SubEvent[];
}

interface ConflictInfo {
  hasConflict: boolean;
  sameDayEvents: { name: string; isHosted: boolean; isInternal: boolean }[];
  overlappingEvents: {
    name: string;
    start: Date;
    end: Date;
    isHosted: boolean;
    isInternal: boolean;
  }[];
  isFree: boolean;
}

function checkSubEventConflicts(
  subEvent: SubEvent,
  availabilityData: GroupAvailabilityData
): ConflictInfo {
  const subEventStart = subEvent.scheduledStartTime.toDate();
  const subEventEnd = subEvent.scheduledEndTime.toDate();
  const subEventDay = new Date(subEventStart);
  subEventDay.setHours(0, 0, 0, 0);

  const allEvents = [
    ...availabilityData.hostedEvents.map((e) => ({ ...e, isHosted: true })),
    ...availabilityData.attendingEvents.map((e) => ({ ...e, isHosted: false })),
  ];

  const sameDayEvents: {
    name: string;
    isHosted: boolean;
    isInternal: boolean;
  }[] = [];
  const overlappingEvents: {
    name: string;
    start: Date;
    end: Date;
    isHosted: boolean;
    isInternal: boolean;
  }[] = [];

  const allSubEvents = availabilityData.hostedSubEvents;

  for (const subEv of allSubEvents) {
    const existingStart = subEv.scheduledStartTime.toDate();
    const existingEnd = subEv.scheduledEndTime.toDate();
    const existingDay = new Date(existingStart);
    existingDay.setHours(0, 0, 0, 0);

    if (existingDay.getTime() === subEventDay.getTime()) {
      const parentEvent = allEvents.find((e) => e.eventId === subEv.eventId);
      if (
        parentEvent &&
        !sameDayEvents.some((e) => e.name === parentEvent.name)
      ) {
        sameDayEvents.push({
          name: parentEvent.name,
          isHosted: parentEvent.isHosted,
          isInternal: parentEvent.isInternal,
        });
      }

      const hasOverlap =
        subEventStart < existingEnd && subEventEnd > existingStart;
      if (hasOverlap) {
        overlappingEvents.push({
          name: `${subEv.name} (${parentEvent?.name || "Unknown"})`,
          start: existingStart,
          end: existingEnd,
          isHosted: parentEvent?.isHosted ?? true,
          isInternal: parentEvent?.isInternal ?? false,
        });
      }
    }
  }

  for (const event of allEvents) {
    const eventStart = event.startTime.toDate();
    const eventEnd = event.endTime.toDate();
    const eventDay = new Date(eventStart);
    eventDay.setHours(0, 0, 0, 0);

    if (eventDay.getTime() === subEventDay.getTime()) {
      if (!sameDayEvents.some((e) => e.name === event.name)) {
        sameDayEvents.push({
          name: event.name,
          isHosted: event.isHosted,
          isInternal: event.isInternal,
        });
      }

      const hasOverlap = subEventStart < eventEnd && subEventEnd > eventStart;
      if (hasOverlap) {
        overlappingEvents.push({
          name: event.name,
          start: eventStart,
          end: eventEnd,
          isHosted: event.isHosted,
          isInternal: event.isInternal,
        });
      }
    }
  }

  const hasConflict = overlappingEvents.length > 0;
  const isFree = sameDayEvents.length === 0;

  return {
    hasConflict,
    sameDayEvents,
    overlappingEvents,
    isFree,
  };
}

function getEventConflicts(
  subEvents: SubEvent[],
  availabilityData: GroupAvailabilityData | undefined
): { hasConflicts: boolean; sameDayCount: number } {
  if (!availabilityData) {
    return { hasConflicts: false, sameDayCount: 0 };
  }

  let hasConflicts = false;
  let sameDayCount = 0;
  const seenSameDayEvents = new Set<string>();

  for (const subEvent of subEvents) {
    const conflict = checkSubEventConflicts(subEvent, availabilityData);
    if (conflict.hasConflict) {
      hasConflicts = true;
    }
    for (const e of conflict.sameDayEvents) {
      if (!seenSameDayEvents.has(e.name)) {
        seenSameDayEvents.add(e.name);
        sameDayCount++;
      }
    }
  }

  return { hasConflicts, sameDayCount };
}

interface EventInvitationsSectionProps {
  pendingInvitations: Event[];
  subEvents: SubEvent[];
  userTimezone: string;
  groups: Group[];
  availabilityData?: GroupAvailabilityData;
  onRespond: (event: Event) => void;
}

export function EventInvitationsSection({
  pendingInvitations,
  subEvents,
  userTimezone,
  groups,
  availabilityData,
  onRespond,
}: EventInvitationsSectionProps) {
  const getGroupInfo = (groupId: bigint) => {
    const group = groups?.find((g) => g.groupId === groupId);
    return {
      name: group?.name || "Unknown Group",
      logo: group?.logoUrl || "",
      tag: group?.tag || "",
      color: group?.color || "#1f2937",
    };
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6">
        {pendingInvitations?.length > 0 ? (
          pendingInvitations.map((event) => {
            const eventSubEvents = subEvents.filter(
              (se) => se.eventId === event.eventId
            );
            const creatorGroupInfo = getGroupInfo(event.creatorGroupId);
            const { hasConflicts, sameDayCount } = getEventConflicts(
              eventSubEvents,
              availabilityData
            );

            return (
              <Card key={event.eventId.toString()} className="overflow-hidden p-0">
                <div className="flex flex-col sm:flex-row">
                  {event.bannerUrl && (
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
                          {hasConflicts && (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Time conflict
                            </Badge>
                          )}
                          {!hasConflicts && sameDayCount > 0 && (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 border-yellow-500 text-yellow-600 dark:text-yellow-400"
                            >
                              <Calendar className="h-3 w-3" />
                              {sameDayCount} event{sameDayCount !== 1 ? "s" : ""}{" "}
                              same day
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {event.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {formatDateInTimezone(event.startTime, userTimezone)}
                          </span>
                          <span>•</span>
                          <span>
                            {formatTimeInTimezone(event.startTime, userTimezone)}
                          </span>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {eventSubEvents.length} sub-events
                          </Badge>
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
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onRespond(event)}>
                          Respond
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <p className="text-muted-foreground">No pending invitations.</p>
        )}
      </div>
    </div>
  );
}

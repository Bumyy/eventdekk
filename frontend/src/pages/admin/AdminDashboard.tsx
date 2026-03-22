import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  useUserTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";
import {
  useGroups,
  useGroupMemberships,
  useSubEvents,
  useFlightSignups,
  useUpcomingHostedEvents,
  useUpcomingAttendingEvents,
  useAllActiveEvents,
} from "@/hooks/spacetimeHooks";
import { Badge } from "@/components/ui/badge";
import {
  AdminWeeklyCalendar,
  type AdminWeeklyCalendarEvent,
} from "@/components/admin/dashboard/AdminWeeklyCalendar";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;
  const groups = useGroups();
  const memberships = useGroupMemberships();
  const subEvents = useSubEvents();
  const signups = useFlightSignups();
  const upcomingHostedEvents = useUpcomingHostedEvents(groupIdBigInt);
  const upcomingAttendingEvents = useUpcomingAttendingEvents(groupIdBigInt);
  const allActiveEvents = useAllActiveEvents();
  const timezone = useUserTimezone();

  // Find the current group
  const currentGroup = groups.find((g) => g.groupId.toString() === groupId);

  const allUpcomingEvents = useMemo(
    () => [...upcomingHostedEvents, ...upcomingAttendingEvents],
    [upcomingHostedEvents, upcomingAttendingEvents]
  );

  const nextEvent = useMemo(() => {
    return [...allUpcomingEvents].sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    )[0];
  }, [allUpcomingEvents]);

  const weeklyCalendarEvents = useMemo<AdminWeeklyCalendarEvent[]>(
    () =>
      allUpcomingEvents.map((event) => ({
        id: event.eventId.toString(),
        name: event.name,
        start: event.startTime.toDate(),
        end: event.endTime.toDate(),
        canEdit: event.creatorGroupId === groupIdBigInt,
        category: event.isInternal
          ? "internal"
          : event.creatorGroupId === groupIdBigInt
            ? "hostingExternal"
            : "attendingExternal",
      })),
    [allUpcomingEvents, groupIdBigInt]
  );

  const allEventsForInsights = useMemo(
    () =>
      allActiveEvents.map((event) => ({
        start: event.startTime.toDate(),
        end: event.endTime.toDate(),
      })),
    [allActiveEvents]
  );

  // Handle case where groupId is not provided
  if (!groupId || !groupIdBigInt) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No group selected</p>
      </div>
    );
  }

  // Calculate attendee counts for an event from its sub-events and signups
  const getEventAttendees = (eventId: bigint) => {
    const eventSubEvents = subEvents.filter((se) => se.eventId === eventId);
    let currentAttendees = 0;
    for (const subEvent of eventSubEvents) {
      const subEventSignups = signups.filter(
        (signup) => signup.subEventId === subEvent.subEventId
      );
      currentAttendees += subEventSignups.length;
    }
    return currentAttendees;
  };

  const attendeeCount = nextEvent ? getEventAttendees(nextEvent.eventId) : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {currentGroup?.logoUrl && (
            <img
              src={currentGroup.logoUrl}
              alt={currentGroup.name}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {currentGroup?.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                style={
                  currentGroup?.color
                    ? { backgroundColor: currentGroup.color }
                    : undefined
                }
              >
                {currentGroup?.tag}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {
                  memberships.filter((m) => m.groupId.toString() === groupId)
                    .length
                }{" "}
                members
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Event Card */}
      {nextEvent && (
        <Card
          className="p-6 cursor-pointer bg-muted/50 hover:bg-muted/60 transition-colors"
          onClick={() =>
            navigate(
              `/admin/groups/${groupId}/events/${nextEvent.eventId.toString()}/edit`
            )
          }
        >
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Next Event</h2>
            <span className="text-lg md:text-2xl font-bold text-primary">
              {formatDistanceToNow(nextEvent.startTime.toDate(), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {nextEvent.bannerUrl && (
              <img
                src={nextEvent.bannerUrl}
                alt={nextEvent.name}
                className="w-full sm:w-48 h-32 object-cover rounded-lg shrink-0"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-medium">{nextEvent.name}</h3>
              <p className="text-muted-foreground">
                {formatDateInTimezone(nextEvent.startTime, timezone)} at{" "}
                {formatTimeInTimezone(nextEvent.startTime, timezone)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {nextEvent.isInternal
                    ? "Internal"
                    : nextEvent.creatorGroupId === groupIdBigInt
                      ? "Hosting"
                      : "Attending"}
                </Badge>
                {!nextEvent.isInternal && (
                  <Badge variant="secondary">External</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {attendeeCount} registered
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <AdminWeeklyCalendar
        events={weeklyCalendarEvents}
        allEventsForInsights={allEventsForInsights}
        onEventClick={(event) => {
          if (!groupId || !event.canEdit) return;
          navigate(`/admin/groups/${groupId}/events/${event.id}/edit`);
        }}
        onScheduleSuggestion={(start, end) => {
          if (!groupId) return;
          const params = new URLSearchParams({
            prefillStart: start.toISOString(),
            prefillEnd: end.toISOString(),
          });
          navigate(`/admin/events/${groupId}?${params.toString()}`);
        }}
      />
    </div>
  );
}

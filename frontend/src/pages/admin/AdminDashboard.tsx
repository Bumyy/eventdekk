import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format } from "date-fns";
import {
  useEvents,
  useGroups,
  useGroupMemberships,
  useSubEvents,
  useFlightSignups,
} from "@/hooks/spacetimeHooks";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export default function AdminDashboard() {
  const { groupId } = useParams();
  const events = useEvents();
  const groups = useGroups();
  const memberships = useGroupMemberships();
  const subEvents = useSubEvents();
  const signups = useFlightSignups();
  const today = new Date();
  const nextWeek = addDays(today, 7);

  // Handle case where groupId is not provided
  if (!groupId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No group selected</p>
      </div>
    );
  }

  // Find the current group
  const currentGroup = groups.find((g) => g.groupId.toString() === groupId);

  // Filter events for this group and sort by date
  const groupEvents = events
    .filter((event) => event.creatorGroupId === BigInt(groupId))
    .sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    );

  // Get the next upcoming event
  const nextEvent = groupEvents.find(
    (event) => event.startTime.toDate() > today
  );

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
        <div>
          <h1 className="text-3xl font-bold">{currentGroup?.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{currentGroup?.tag}</Badge>
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

      {/* Next Event Card */}
      {nextEvent && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Next Event</h2>
          <div className="flex gap-6">
            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
              {nextEvent.bannerUrl ? (
                <img
                  src={nextEvent.bannerUrl}
                  alt={nextEvent.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Building2 className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium">{nextEvent.name}</h3>
              <p className="text-muted-foreground">
                {format(nextEvent.startTime.toDate(), "MMMM d, yyyy")} at{" "}
                {format(nextEvent.startTime.toDate(), "h:mm a")}
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {attendeeCount} registered participants
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Calendar */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Calendar</h2>
        <Calendar
          mode="range"
          selected={{
            from: today,
            to: nextWeek,
          }}
          className="rounded-md border"
        />
      </Card>
    </div>
  );
}

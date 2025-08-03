import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format } from "date-fns";
import { useSpacetime } from "@/components/SpacetimeProvider";
import {
  useEvents,
  useGroups,
  useGroupMemberships,
} from "@/hooks/spacetimeHooks";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export default function AdminDashboard() {
  const { groupId } = useParams();
  const { connection } = useSpacetime();
  const events = useEvents(connection);
  const groups = useGroups(connection);
  const memberships = useGroupMemberships(connection);
  const today = new Date();
  const nextWeek = addDays(today, 7);

  // Find the current group
  const currentGroup = groups.find((g) => g.groupId.toString() === groupId);

  // Filter events for this group and sort by date
  const groupEvents = events
    .filter((event) => event.groupId === groupId)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  // Get the next upcoming event
  const nextEvent = groupEvents.find(
    (event) => new Date(event.startTime) > today
  );

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
              {nextEvent.imageUrl ? (
                <img
                  src={nextEvent.imageUrl}
                  alt={nextEvent.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Building2 className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium">{nextEvent.title}</h3>
              <p className="text-muted-foreground">
                {format(new Date(nextEvent.startTime), "MMMM d, yyyy")} at{" "}
                {format(new Date(nextEvent.startTime), "h:mm a")}
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${
                          (nextEvent.currentAttendees /
                            nextEvent.maxAttendees) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {nextEvent.currentAttendees}/{nextEvent.maxAttendees}
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

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Event, SubEvent } from "@/module_bindings/types";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";

interface EventInvitationsSectionProps {
  pendingInvitations: Event[];
  subEvents: SubEvent[];
  userTimezone: string;
  onRespond: (event: Event) => void;
}

export function EventInvitationsSection({
  pendingInvitations,
  subEvents,
  userTimezone,
  onRespond,
}: EventInvitationsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6">
        {pendingInvitations?.length > 0 ? (
          pendingInvitations.map((event) => {
            const eventSubEvents = subEvents.filter(
              (se) => se.eventId === event.eventId
            );

            return (
              <Card key={event.eventId.toString()} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">{event.name}</h2>
                    <p className="text-muted-foreground">{event.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onRespond(event)}>
                      Respond
                    </Button>
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

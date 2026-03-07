import { SubEvent, Event } from "@/module_bindings/types";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";

interface PastEventsSectionProps {
  pastEvents: Event[];
  subEvents: SubEvent[];
  userTimezone: string;
}

export function PastEventsSection({
  pastEvents,
  subEvents,
  userTimezone,
}: PastEventsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6">
        {pastEvents.map((event) => {
          const eventSubEvents = subEvents.filter(
            (se) => se.eventId === event.eventId
          );
          return (
            <div
              key={event.eventId.toString()}
              className="p-4 border rounded-lg bg-card"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{event.name}</h2>
                    <span className="text-sm text-muted-foreground border px-2 py-0.5 rounded">
                      {eventSubEvents.length} Sub-events
                    </span>
                  </div>
                  <p className="text-muted-foreground">{event.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {formatDateInTimezone(event.startTime, userTimezone)}
                    </span>
                    <span>•</span>
                    <span>
                      {formatTimeInTimezone(event.startTime, userTimezone)}
                    </span>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm border rounded-md hover:bg-accent">
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

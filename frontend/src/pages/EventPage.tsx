import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/hooks/spacetimeHooks";
import { EventDetailsContent } from "@/components/events/EventDetailsContent";

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const events = useEvents();

  const event = useMemo(
    () => events.find((item) => item.eventId.toString() === eventId),
    [events, eventId]
  );

  if (!event) {
    return (
      <div className="mx-4 my-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-lg font-semibold">Event not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This event may not exist, or it may have been removed.
          </p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="h-full">
        <EventDetailsContent event={event} />
      </div>
    </div>
  );
}

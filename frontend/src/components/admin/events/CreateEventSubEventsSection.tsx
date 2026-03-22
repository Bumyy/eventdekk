import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCreateEventContext } from "./CreateEventContext";
import { CreateEventSubEventCard } from "./CreateEventSubEventCard";

export function CreateEventSubEventsSection() {
  const { subEvents, handleAddSubEvent } = useCreateEventContext();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sub Events</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSubEvent}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Sub Event
        </Button>
      </div>

      <div className="space-y-4">
        {subEvents.map((subEvent, index) => (
          <CreateEventSubEventCard
            key={`${subEvent.name}-${index}-${subEvent.scheduledStartTime.getTime()}`}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

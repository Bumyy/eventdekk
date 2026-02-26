import { useState } from "react";
import Calendar from "@/components/Calendar";
import { Loader2 } from "lucide-react";
import { useEvents, useSubEvents, useGroups } from "@/hooks/spacetimeHooks";
import { Badge } from "@/components/ui/badge";

const CalendarView = () => {
  const events = useEvents();
  const subEvents = useSubEvents();
  const groups = useGroups();

  // For managing selected groups (could be expanded with actual filtering)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Loading state
  const isLoading = !events || !subEvents || !groups;

  return (
    <div className="space-y-8 mx-4 my-2">
      {/* Selected Groups - placeholder for now */}
      {selectedGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGroups.map((groupId) => {
            const group = groups?.find((g) => g.groupId.toString() === groupId);
            return (
              <Badge key={groupId} variant="outline">
                {group?.name || "Unknown Group"}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        /* Calendar Component with real data */
        <Calendar events={events || []} subEvents={subEvents || []} />
      )}
    </div>
  );
};

export default CalendarView;

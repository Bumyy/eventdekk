import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { useGroups } from "@/hooks/spacetimeHooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Infer } from "spacetimedb";
import { Event } from "@/module_bindings";

type Event = Infer<typeof Event>;

interface EventCardProps {
  event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
  const groups = useGroups();

  // Get host group information
  const hostGroup = groups?.find((g) => g.groupId === event.creatorGroupId);
  const groupColor = hostGroup?.color || "#000000";

  return (
    <Card
      className="group overflow-hidden hover:shadow-lg transition-all duration-300 p-0 border-l-4"
      style={{ borderLeftColor: groupColor }}
    >
      {/* Event Image with Info Overlay */}
      <div className="relative w-full overflow-hidden aspect-video">
        <img
          src={event.bannerUrl || "/placeholder-event.jpg"}
          alt={event.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
        />

        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white flex flex-col p-2 space-y-1 transition-all duration-300 group-hover:bg-black/90">
          {/* Time */}
          <div className="flex items-center text-xs text-white/80">
            <Clock className="h-3 w-3 mr-1" />
            <span>{format(event.startTime.toDate(), "MMM d, h:mm a")}</span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-1">{event.name}</h3>

          {/* Host information */}
          <div
            className="flex items-center gap-1 text-xs text-white/70 rounded px-1 -mx-1"
            style={{ backgroundColor: `${groupColor}20` }}
          >
            <Avatar className="h-4 w-4">
              <AvatarImage
                src={hostGroup?.logoUrl}
                alt={hostGroup?.name || "Host"}
              />
              <AvatarFallback
                className="text-[8px]"
                style={{ backgroundColor: groupColor }}
              >
                {hostGroup?.tag || hostGroup?.name?.substring(0, 2) || "H"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {hostGroup?.name || "Unknown Group"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

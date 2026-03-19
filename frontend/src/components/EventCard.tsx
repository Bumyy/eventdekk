import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useGroups } from "@/hooks/spacetimeHooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Infer } from "spacetimedb";
import { Event } from "@/module_bindings";
import { useUserTimezone, formatInTimezone } from "@/utils/timezoneUtils";

type Event = Infer<typeof Event>;

interface EventCardProps {
  event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
  const groups = useGroups();
  const userTimezone = useUserTimezone();

  const hostGroup = groups?.find((g) => g.groupId === event.creatorGroupId);
  const groupColor = hostGroup?.color || "#000000";

  const formattedStartTime = formatInTimezone(event.startTime, userTimezone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card
      className="group overflow-hidden hover:shadow-lg transition-all duration-300 p-0 border-l-4"
      style={{ borderLeftColor: groupColor }}
    >
      <div className="relative w-full overflow-hidden aspect-video">
        <img
          src={event.bannerUrl || "/placeholder-event.jpg"}
          alt={event.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none transition-all duration-300" />

        <div className="absolute bottom-0 left-0 right-0 z-10 text-white flex flex-col p-2">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-1 mb-0.5">
            {event.name}
          </h3>

          {/* Meta row: time + host */}
          <div className="flex items-center gap-2 text-[11px] text-white/70">
            <div className="flex items-center">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              <span>{formattedStartTime}</span>
            </div>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-1 min-w-0">
              <Avatar className="h-3.5 w-3.5">
                <AvatarImage
                  src={hostGroup?.logoUrl}
                  alt={hostGroup?.name || "Host"}
                />
                <AvatarFallback
                  className="text-[6px]"
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
      </div>
    </Card>
  );
};

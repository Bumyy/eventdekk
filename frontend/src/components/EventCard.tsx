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
  const hasBannerImage = Boolean(event.bannerUrl);

  const formattedStartTime = formatInTimezone(event.startTime, userTimezone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 p-0 border-0 rounded-lg">
      <div className="relative w-full overflow-hidden aspect-video rounded-t-lg">
        {hasBannerImage ? (
          <img
            src={event.bannerUrl}
            alt={event.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center px-4 text-center group-hover:scale-105 transition-transform duration-300"
            style={{
              background: `linear-gradient(135deg, ${groupColor} 0%, ${groupColor}99 45%, #111827 100%)`,
            }}
          >
            <span className="text-white/80 text-[10px] uppercase tracking-[0.2em] mb-2">
              {hostGroup?.name || "Event"}
            </span>
            <h3 className="text-white text-lg font-semibold leading-tight line-clamp-3">
              {event.name}
            </h3>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none transition-all duration-300" />

        <div className="absolute bottom-0 left-0 right-0 z-10 text-white flex flex-col p-2 pb-3">
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
                <AvatarFallback className="text-[6px]">
                  {hostGroup?.tag || hostGroup?.name?.substring(0, 2) || "H"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {hostGroup?.name || "Unknown Group"}
              </span>
            </div>
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-1 group-hover:h-14 transition-all duration-300"
          style={{ backgroundColor: groupColor }}
        />
      </div>
    </Card>
  );
};

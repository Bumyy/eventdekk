import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  useGroups,
  useEventParticipantsForEvent,
} from "@/hooks/spacetimeHooks";
import { Infer } from "spacetimedb";
import { Event } from "@/module_bindings";
import { useUserTimezone, formatInTimezone } from "@/utils/timezoneUtils";
import { HostsDisplay, useHostColors } from "@/components/events/HostsDisplay";

type Event = Infer<typeof Event>;

interface EventCardProps {
  event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
  const groups = useGroups();
  const userTimezone = useUserTimezone();
  const eventParticipants = useEventParticipantsForEvent(event.eventId);

  const hostGroup = groups?.find((g) => g.groupId === event.creatorGroupId);
  const hasBannerImage = Boolean(event.bannerUrl);
  const { gradientStyle, bottomBarStyle } = useHostColors(
    hostGroup,
    eventParticipants,
    groups,
    event.creatorGroupId,
    event.eventId
  );

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
            style={gradientStyle}
          >
            <HostsDisplay
              hostGroup={hostGroup}
              eventParticipants={eventParticipants}
              groups={groups}
              creatorGroupId={event.creatorGroupId}
              eventId={event.eventId}
              size="sm"
            />
            <h3 className="text-white text-lg font-semibold leading-tight line-clamp-3">
              {event.name}
            </h3>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none transition-all duration-300" />

        <div className="absolute bottom-0 left-0 right-0 z-10 text-white flex flex-col p-2 pb-3">
          <h3 className="font-semibold text-sm line-clamp-1 mb-0.5">
            {event.name}
          </h3>

          <div className="flex items-center gap-2 text-[11px] text-white/70">
            <div className="flex items-center">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              <span>{formattedStartTime}</span>
            </div>
            <span className="text-white/40">•</span>
            <HostsDisplay
              hostGroup={hostGroup}
              eventParticipants={eventParticipants}
              groups={groups}
              creatorGroupId={event.creatorGroupId}
              eventId={event.eventId}
              size="sm"
            />
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-1 group-hover:h-14 transition-all duration-300"
          style={bottomBarStyle}
        />
      </div>
    </Card>
  );
};

import { Infer } from "spacetimedb";
import { Event, Group, EventParticipant } from "@/module_bindings/types";
import { HostsDisplay, useHostColors } from "./HostsDisplay";

type EventType = Infer<typeof Event>;

interface EventBannerProps {
  event: EventType;
  hostGroup?: Group | null;
  eventParticipants?: EventParticipant[];
  groups?: Group[];
}

export function EventBanner({
  event,
  hostGroup,
  eventParticipants = [],
  groups = [],
}: EventBannerProps) {
  const { bottomBarStyle } = useHostColors(
    hostGroup,
    eventParticipants,
    groups,
    event.creatorGroupId,
    event.eventId
  );

  return (
    <div className="relative border-b">
      <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-slate-100 via-sky-50 to-emerald-50" />
      {event.bannerUrl && (
        <img
          src={event.bannerUrl}
          alt={event.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-black/15" />
      <div className="absolute bottom-3 left-3 right-3 z-10 sm:bottom-4 sm:left-4 sm:right-4">
        <h1 className="text-white text-xl sm:text-3xl font-bold leading-tight">
          {event.name}
        </h1>
        <p className="text-white/90 text-sm line-clamp-2">
          {event.description}
        </p>
        <div className="mt-1.5">
          <HostsDisplay
            hostGroup={hostGroup}
            eventParticipants={eventParticipants}
            groups={groups}
            creatorGroupId={event.creatorGroupId}
            eventId={event.eventId}
            size="md"
          />
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={bottomBarStyle}
      />
    </div>
  );
}

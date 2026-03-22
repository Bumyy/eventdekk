import { Infer } from "spacetimedb";
import { Event, Group } from "@/module_bindings/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type EventType = Infer<typeof Event>;

interface EventBannerProps {
  event: EventType;
  hostGroup?: Group | null;
}

export function EventBanner({ event, hostGroup }: EventBannerProps) {
  const groupColor = hostGroup?.color || "#000000";

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
        {hostGroup && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage
                src={hostGroup.logoUrl || ""}
                alt={hostGroup.name || "Host"}
              />
              <AvatarFallback className="text-[8px]">
                {hostGroup.tag || hostGroup.name?.substring(0, 2) || "H"}
              </AvatarFallback>
            </Avatar>
            <span className="text-white/80 text-xs">
              {hostGroup.name || "Unknown Group"}
            </span>
            <div
              className="w-2 h-2 rounded-full ml-0.5"
              style={{ backgroundColor: groupColor }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
import { Group, EventParticipant } from "@/module_bindings/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";

interface HostsDisplayProps {
  hostGroup: Group | null | undefined;
  eventParticipants: EventParticipant[];
  groups: Group[];
  creatorGroupId: bigint;
  eventId?: bigint;
  size?: "sm" | "md";
}

export function HostsDisplay({
  hostGroup,
  eventParticipants,
  groups,
  creatorGroupId,
  eventId,
  size = "md",
}: HostsDisplayProps) {
  const allHostGroups = useMemo(() => {
    const groupMap = new Map(groups?.map((g) => [g.groupId, g]) || []);
    const hosts = eventParticipants
      .filter((p) => !eventId || p.eventId === eventId)
      .filter((p) => p.role.tag === "Host" && p.status.tag === "Accepted")
      .map((p) => groupMap.get(p.groupId))
      .filter((g): g is NonNullable<typeof g> => !!g);
    const creatorAsGroup = groupMap.get(creatorGroupId);
    if (creatorAsGroup && !hosts.find((h) => h.groupId === creatorGroupId)) {
      hosts.unshift(creatorAsGroup);
    }
    return hosts.slice(0, 3);
  }, [groups, eventParticipants, creatorGroupId, eventId]);

  const avatarSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";
  const fallbackSize = size === "sm" ? "text-[6px]" : "text-[8px]";

  if (allHostGroups.length === 0 && hostGroup) {
    return (
      <div className="flex items-center gap-1">
        <Avatar className={avatarSize}>
          <AvatarImage
            src={hostGroup.logoUrl || ""}
            alt={hostGroup.name || "Host"}
          />
          <AvatarFallback className={fallbackSize}>
            {hostGroup.tag || hostGroup.name?.substring(0, 2) || "H"}
          </AvatarFallback>
        </Avatar>
        <span className={`truncate ${textSize}`}>
          {hostGroup.name || "Unknown"}
        </span>
      </div>
    );
  }

  if (allHostGroups.length === 1) {
    const group = allHostGroups[0];
    return (
      <div className="flex items-center gap-1 min-w-0">
        <Avatar className={avatarSize}>
          <AvatarImage src={group.logoUrl || ""} alt={group.name || "Host"} />
          <AvatarFallback className={fallbackSize}>
            {group.tag || group.name?.substring(0, 2) || "H"}
          </AvatarFallback>
        </Avatar>
        <span className={`truncate ${textSize}`}>
          {group.name || "Unknown"}
        </span>
      </div>
    );
  }

  if (allHostGroups.length === 2) {
    return (
      <div className="flex items-center gap-1 min-w-0 flex-wrap">
        {allHostGroups.map((group, idx) => (
          <span key={group.groupId} className="flex items-center gap-0.5">
            {idx > 0 && <span className="text-white/40 mx-0.5">×</span>}
            <Avatar className={avatarSize}>
              <AvatarImage
                src={group.logoUrl || ""}
                alt={group.name || "Host"}
              />
              <AvatarFallback className={fallbackSize}>
                {group.tag || group.name?.substring(0, 2) || "H"}
              </AvatarFallback>
            </Avatar>
            <span className={`truncate ${textSize}`}>
              {group.tag || group.name?.substring(0, 3)}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 min-w-0">
      <div className="flex items-center -space-x-1">
        {allHostGroups.map((group) => (
          <Avatar
            key={group.groupId}
            className={`${avatarSize} border border-white/20`}
          >
            <AvatarImage src={group.logoUrl || ""} alt={group.name || "Host"} />
            <AvatarFallback className={fallbackSize}>
              {group.tag || group.name?.substring(0, 2) || "H"}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  );
}

export function useHostColors(
  hostGroup: Group | null | undefined,
  eventParticipants: EventParticipant[],
  groups: Group[],
  creatorGroupId: bigint,
  eventId?: bigint
) {
  return useMemo(() => {
    const groupMap = new Map(groups?.map((g) => [g.groupId, g]) || []);
    const hosts = eventParticipants
      .filter((p) => !eventId || p.eventId === eventId)
      .filter((p) => p.role.tag === "Host" && p.status.tag === "Accepted")
      .map((p) => groupMap.get(p.groupId))
      .filter((g): g is NonNullable<typeof g> => !!g);
    const creatorAsGroup = groupMap.get(creatorGroupId);
    if (creatorAsGroup && !hosts.find((h) => h.groupId === creatorGroupId)) {
      hosts.unshift(creatorAsGroup);
    }
    const allHosts = hosts.slice(0, 3);

    const primaryColor = hostGroup?.color || "#3b82f6";
    const secondaryColor = allHosts[1]?.color;
    const tertiaryColor = allHosts[2]?.color;

    const getGradientStyle = () => {
      if (allHosts.length === 1) {
        return {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 45%, #111827 100%)`,
        };
      } else if (allHosts.length === 2) {
        return {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 60%, #111827 100%)`,
        };
      } else {
        return {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 40%, ${tertiaryColor} 70%, #111827 100%)`,
        };
      }
    };

    const getBottomBarStyle = () => {
      if (allHosts.length === 1) {
        return { backgroundColor: primaryColor };
      } else if (allHosts.length === 2) {
        return {
          background: `linear-gradient(to right, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        };
      } else {
        return {
          background: `linear-gradient(to right, ${primaryColor} 0%, ${secondaryColor} 50%, ${tertiaryColor} 100%)`,
        };
      }
    };

    return {
      allHostGroups: allHosts,
      primaryColor,
      gradientStyle: getGradientStyle(),
      bottomBarStyle: getBottomBarStyle(),
    };
  }, [hostGroup, eventParticipants, groups, creatorGroupId, eventId]);
}

import { ArrowRight, Plane } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Group, FlightSignup, SubEventType } from "@/module_bindings/types";

interface ParticipantListProps {
  signups: FlightSignup[];
  groups: Group[];
  subEventType?: SubEventType;
  hubIcao?: string | null;
}

export function ParticipantList({
  signups,
  groups,
  subEventType,
  hubIcao,
}: ParticipantListProps) {
  if (signups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No groups have joined this wave yet.
      </p>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {signups.map((signup) => {
        const group = groups.find((g) => g.groupId === signup.groupId);
        return (
          <div
            key={signup.signupId.toString()}
            className="inline-flex items-center gap-1.5 rounded border bg-background px-2 py-1"
          >
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarImage
                src={group?.logoUrl || ""}
                alt={group?.name || "Group"}
              />
              <AvatarFallback className="text-[9px]">
                {group?.tag || group?.name?.slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="truncate text-xs font-medium">
                {group?.name || "Unknown"}
              </span>
              {signup.callsign && (
                <span className="text-[10px] text-muted-foreground truncate">
                  ({signup.callsign})
                </span>
              )}
            </div>
            {signup.aircraftType && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Plane className="h-3 w-3" />
                <span className="truncate max-w-[80px]">
                  {signup.aircraftType}
                </span>
              </div>
            )}
            {(subEventType?.tag === "FlyIn" ||
              subEventType?.tag === "FlyOut") && (
              <div className="flex items-center gap-0.5 text-[10px] font-mono">
                {subEventType.tag === "FlyIn" && (
                  <>
                    <span>{signup.departureIcao || "???"}</span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    <span>{hubIcao || "???"}</span>
                  </>
                )}
                {subEventType.tag === "FlyOut" && (
                  <>
                    <span>{hubIcao || "???"}</span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    <span>{signup.arrivalIcao || "???"}</span>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

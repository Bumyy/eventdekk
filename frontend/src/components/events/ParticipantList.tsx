import { ArrowRight } from "lucide-react";
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
      <p className="mt-2 text-sm text-muted-foreground">
        No groups have joined this wave yet.
      </p>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {signups.map((signup) => {
        const group = groups.find((g) => g.groupId === signup.groupId);
        return (
          <div
            key={signup.signupId.toString()}
            className="flex items-center gap-2 rounded-md border bg-background p-2"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={group?.logoUrl || ""}
                alt={group?.name || "Group"}
              />
              <AvatarFallback>
                {group?.tag || group?.name?.slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {group?.name || "Unknown Group"}
              </p>
              {(signup.callsign || signup.aircraftType) && (
                <p className="truncate text-xs text-muted-foreground">
                  {[signup.callsign, signup.aircraftType]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
              )}
              {subEventType?.tag === "FlyIn" && (
                <p className="truncate text-base sm:text-lg font-semibold tracking-tight">
                  <span className="font-mono">
                    {signup.departureIcao || "???"}
                  </span>{" "}
                  <ArrowRight className="mx-1 inline h-4 w-4 align-[-1px] text-muted-foreground" />
                  <span className="font-mono">
                    {hubIcao || signup.arrivalIcao || "???"}
                  </span>
                </p>
              )}
              {subEventType?.tag === "FlyOut" && (
                <p className="truncate text-base sm:text-lg font-semibold tracking-tight">
                  <span className="font-mono">
                    {hubIcao || signup.departureIcao || "???"}
                  </span>{" "}
                  <ArrowRight className="mx-1 inline h-4 w-4 align-[-1px] text-muted-foreground" />
                  <span className="font-mono">
                    {signup.arrivalIcao || "???"}
                  </span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

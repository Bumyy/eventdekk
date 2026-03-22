import { ArrowRight } from "lucide-react";
import { SubEventType } from "@/module_bindings/types";

interface RouteDisplayProps {
  subEventType: SubEventType;
  departureIcao?: string | null;
  arrivalIcao?: string | null;
  hubIcao?: string | null;
}

export function RouteDisplay({
  subEventType,
  departureIcao,
  arrivalIcao,
  hubIcao,
}: RouteDisplayProps) {
  if (subEventType.tag === "GroupFlight" && departureIcao && arrivalIcao) {
    return (
      <span className="inline-flex items-center gap-2">
        <span>{departureIcao}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span>{arrivalIcao}</span>
      </span>
    );
  }

  if (hubIcao) {
    return (
      <span>
        {subEventType.tag === "FlyIn" ? "To" : "From"} {hubIcao}
      </span>
    );
  }

  return null;
}

import { Badge } from "@/components/ui/badge";
import { MapPin, Plane } from "lucide-react";
import { SubEventType } from "@/module_bindings/types";

interface SubEventTypeBadgeProps {
  type: SubEventType;
}

export function SubEventTypeBadge({ type }: SubEventTypeBadgeProps) {
  switch (type.tag) {
    case "GroupFlight":
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Group Flight
        </Badge>
      );
    case "FlyIn":
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Fly-in
        </Badge>
      );
    case "FlyOut":
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Fly-out
        </Badge>
      );
  }
}

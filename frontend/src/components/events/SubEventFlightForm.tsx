import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AircraftLiveryPicker,
  type AircraftLiveryValue,
} from "@/components/AircraftLiveryPicker";
import { SubEventType } from "@/module_bindings/types";

const limitIcaoLength = (icao: string) => icao.slice(0, 4);

interface SubEventFlightFormProps {
  subEvent: {
    subEventId: bigint;
    subEventType: SubEventType;
    hubIcao?: string | null;
    groupFlightDepartureIcao?: string | null;
    groupFlightArrivalIcao?: string | null;
    groupFlightRoute?: string | null;
  };
  callsign: string;
  callsignError?: string;
  aircraftType: string;
  liveryId: string;
  departureIcao: string;
  arrivalIcao: string;
  route: string;
  departureTime?: string;
  arrivalTime?: string;
  onCallsignChange: (value: string) => void;
  onAircraftChange: (value: AircraftLiveryValue) => void;
  onDepartureIcaoChange: (value: string) => void;
  onArrivalIcaoChange: (value: string) => void;
  onRouteChange: (value: string) => void;
  onDepartureTimeChange: (value: string | undefined) => void;
  onArrivalTimeChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function SubEventFlightForm({
  subEvent,
  callsign,
  callsignError,
  aircraftType,
  liveryId,
  departureIcao,
  arrivalIcao,
  route,
  departureTime,
  arrivalTime,
  onCallsignChange,
  onAircraftChange,
  onDepartureIcaoChange,
  onArrivalIcaoChange,
  onRouteChange,
  onDepartureTimeChange,
  onArrivalTimeChange,
  disabled = false,
}: SubEventFlightFormProps) {
  const isGroupFlight = subEvent.subEventType.tag === "GroupFlight";
  const isFlyIn = subEvent.subEventType.tag === "FlyIn";
  const isFlyOut = subEvent.subEventType.tag === "FlyOut";

  const departureIcaoError =
    !isGroupFlight && !isFlyOut && departureIcao.trim().length > 0 && departureIcao.trim().length !== 4
      ? "ICAO must be exactly 4 characters."
      : undefined;
  const arrivalIcaoError =
    !isGroupFlight && !isFlyIn && arrivalIcao.trim().length > 0 && arrivalIcao.trim().length !== 4
      ? "ICAO must be exactly 4 characters."
      : undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Callsign</Label>
          <Input
            value={callsign}
            onChange={(e) => onCallsignChange(e.target.value)}
            placeholder="e.g. QFA123"
            disabled={disabled}
            aria-invalid={!!callsignError}
          />
          {callsignError && (
            <p className="text-xs text-destructive mt-1">{callsignError}</p>
          )}
        </div>

        <div className="space-y-1">
          <AircraftLiveryPicker
            id={`aircraft-${subEvent.subEventId}`}
            value={{ aircraftName: aircraftType, liveryId }}
            onChange={onAircraftChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>
            {isGroupFlight
              ? "Departure Airport (Fixed)"
              : isFlyOut
                ? "Departure Airport (Hub)"
                : "Departure Airport"}
          </Label>
          <Input
            value={departureIcao}
            onChange={(e) => onDepartureIcaoChange(limitIcaoLength(e.target.value))}
            placeholder={
              isGroupFlight || isFlyOut
                ? isGroupFlight
                  ? subEvent.groupFlightDepartureIcao || "Fixed departure"
                  : subEvent.hubIcao || "Fixed hub departure"
                : "Enter departure ICAO"
            }
            disabled={disabled || isGroupFlight || isFlyOut}
            maxLength={4}
            aria-invalid={!!departureIcaoError}
          />
          {departureIcaoError && (
            <p className="text-xs text-destructive mt-1">{departureIcaoError}</p>
          )}
          {(isGroupFlight || isFlyOut) && (
            <p className="text-xs text-muted-foreground mt-1">
              Departure is fixed to:{" "}
              {isGroupFlight
                ? subEvent.groupFlightDepartureIcao
                : subEvent.hubIcao}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label>
            {isGroupFlight
              ? "Arrival Airport (Fixed)"
              : isFlyIn
                ? "Arrival Airport (Hub)"
                : "Arrival Airport"}
          </Label>
          <Input
            value={arrivalIcao}
            onChange={(e) => onArrivalIcaoChange(limitIcaoLength(e.target.value))}
            placeholder={
              isGroupFlight || isFlyIn
                ? isGroupFlight
                  ? subEvent.groupFlightArrivalIcao || "Fixed arrival"
                  : subEvent.hubIcao || "Fixed hub arrival"
                : "Enter arrival ICAO"
            }
            disabled={disabled || isGroupFlight || isFlyIn}
            maxLength={4}
            aria-invalid={!!arrivalIcaoError}
          />
          {arrivalIcaoError && (
            <p className="text-xs text-destructive mt-1">{arrivalIcaoError}</p>
          )}
          {(isGroupFlight || isFlyIn) && (
            <p className="text-xs text-muted-foreground mt-1">
              Arrival is fixed to:{" "}
              {isGroupFlight
                ? subEvent.groupFlightArrivalIcao
                : subEvent.hubIcao}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>
          {isGroupFlight
            ? "Route (Based on group flight)"
            : "Your Flight Route"}
        </Label>
        <Input
          value={route}
          onChange={(e) => onRouteChange(e.target.value)}
          placeholder={
            isGroupFlight
              ? subEvent.groupFlightRoute || "Using planned group flight route"
              : "Enter your flight route"
          }
          disabled={disabled}
        />
        {isGroupFlight && subEvent.groupFlightRoute && (
          <p className="text-xs text-muted-foreground mt-1">
            Planned route: {subEvent.groupFlightRoute}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Planned Departure Time</Label>
          <Input
            type="datetime-local"
            value={departureTime || ""}
            onChange={(e) => onDepartureTimeChange(e.target.value || undefined)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label>Planned Arrival Time</Label>
          <Input
            type="datetime-local"
            value={arrivalTime || ""}
            onChange={(e) => onArrivalTimeChange(e.target.value || undefined)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
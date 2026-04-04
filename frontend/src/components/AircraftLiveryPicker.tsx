import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAircraftLiveries,
  fetchAircraftOptions,
  type AircraftOption,
  type LiveryOption,
} from "@/services/aircraftService";
import { Loader2 } from "lucide-react";

export interface AircraftLiveryValue {
  aircraftName: string;
  liveryId: string;
}

interface AircraftLiveryPickerProps {
  id?: string;
  value: AircraftLiveryValue;
  onChange: (value: AircraftLiveryValue) => void;
  disabled?: boolean;
  className?: string;
}

export function AircraftLiveryPicker({
  id,
  value,
  onChange,
  disabled = false,
  className,
}: AircraftLiveryPickerProps) {
  const [aircraftOptions, setAircraftOptions] = useState<AircraftOption[]>([]);
  const [isLoadingAircraft, setIsLoadingAircraft] = useState(false);
  const [liveriesByAircraft, setLiveriesByAircraft] = useState<
    Record<string, LiveryOption[]>
  >({});
  const [isLoadingLiveriesByAircraft, setIsLoadingLiveriesByAircraft] =
    useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [openPopover, setOpenPopover] = useState(false);
  const hasLoadedAircraft = useRef(false);
  const [aircraftLoadError, setAircraftLoadError] = useState<string | null>(
    null
  );

  const loadAircraft = useCallback(async () => {
    try {
      setIsLoadingAircraft(true);
      setAircraftLoadError(null);
      const data = await fetchAircraftOptions();
      setAircraftOptions(data);
    } catch (error) {
      console.error("Failed to load aircraft options:", error);
      setAircraftLoadError("Could not load aircraft. Try again.");
    } finally {
      setIsLoadingAircraft(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedAircraft.current) return;
    hasLoadedAircraft.current = true;

    let cancelled = false;
    loadAircraft().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [loadAircraft]);

  const selectedAircraft =
    aircraftOptions.find((a) => a.name === value.aircraftName) || null;

  const loadLiveriesForAircraft = async (aircraftId: string) => {
    if (!aircraftId || liveriesByAircraft[aircraftId]) return;
    try {
      setIsLoadingLiveriesByAircraft((prev) => ({
        ...prev,
        [aircraftId]: true,
      }));
      const liveries = await fetchAircraftLiveries(aircraftId);
      setLiveriesByAircraft((prev) => ({ ...prev, [aircraftId]: liveries }));
    } catch (error) {
      console.error("Failed to load liveries:", error);
      setLiveriesByAircraft((prev) => ({ ...prev, [aircraftId]: [] }));
    } finally {
      setIsLoadingLiveriesByAircraft((prev) => ({
        ...prev,
        [aircraftId]: false,
      }));
    }
  };

  useEffect(() => {
    if (selectedAircraft && !liveriesByAircraft[selectedAircraft.id]) {
      loadLiveriesForAircraft(selectedAircraft.id);
    }
  }, [selectedAircraft]);

  const handleSelectAircraft = (aircraft: AircraftOption | null) => {
    if (aircraft) {
      onChange({ aircraftName: aircraft.name, liveryId: "" });
      loadLiveriesForAircraft(aircraft.id);
    } else {
      onChange({ aircraftName: "", liveryId: "" });
    }
    setSearchQuery("");
  };

  const handleSelectLivery = (liveryId: string) => {
    onChange({ ...value, liveryId });
  };

  const filteredAircraft = searchQuery.trim()
    ? aircraftOptions.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : aircraftOptions;

  const isLoadingLiveries = selectedAircraft
    ? isLoadingLiveriesByAircraft[selectedAircraft.id] || false
    : false;

  return (
    <div className={className}>
      <div className="space-y-1">
        <Label htmlFor={id}>Aircraft & Livery</Label>
        <Popover
          open={openPopover}
          onOpenChange={(nextOpen) => {
            setOpenPopover(nextOpen);
            if (
              nextOpen &&
              !isLoadingAircraft &&
              aircraftOptions.length === 0
            ) {
              void loadAircraft();
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-between"
              disabled={disabled || isLoadingAircraft}
            >
              <span className="truncate">
                {isLoadingAircraft
                  ? "Loading aircraft..."
                  : value.aircraftName
                    ? value.liveryId
                      ? `${value.aircraftName} — ${
                          (
                            liveriesByAircraft[selectedAircraft?.id || ""] || []
                          ).find((l) => l.id === value.liveryId)?.liveryName ||
                          "Custom"
                        }`
                      : value.aircraftName
                    : "Select aircraft & livery"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(calc(100vw-2rem),24rem)] p-3"
            align="start"
            sideOffset={6}
            collisionPadding={16}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Aircraft
                </Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search aircraft..."
                  disabled={disabled}
                />
                <div className="max-h-28 overflow-y-auto overscroll-contain rounded-md border bg-background">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      handleSelectAircraft(null);
                      setOpenPopover(false);
                    }}
                  >
                    None
                  </button>
                  {filteredAircraft.map((aircraft) => (
                    <button
                      key={aircraft.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                        value.aircraftName === aircraft.name ? "bg-accent" : ""
                      }`}
                      onClick={() => {
                        handleSelectAircraft(aircraft);
                      }}
                    >
                      {aircraft.name}
                    </button>
                  ))}
                  {!isLoadingAircraft && filteredAircraft.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No aircraft found.
                    </div>
                  )}
                </div>
                {aircraftLoadError && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-destructive">
                      {aircraftLoadError}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadAircraft()}
                      disabled={isLoadingAircraft}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>

              {selectedAircraft && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Livery
                  </Label>
                  {isLoadingLiveries ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">
                        Loading liveries...
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={value.liveryId || "none"}
                      onValueChange={(v) =>
                        handleSelectLivery(v === "none" ? "" : v)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select livery" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(liveriesByAircraft[selectedAircraft.id] || []).map(
                          (livery) => (
                            <SelectItem key={livery.id} value={livery.id}>
                              {livery.liveryName}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {!selectedAircraft && (
                <p className="text-[11px] text-muted-foreground px-1">
                  Select an aircraft first to choose a livery.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

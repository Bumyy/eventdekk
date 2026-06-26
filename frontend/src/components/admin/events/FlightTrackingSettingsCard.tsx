import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditEventContext } from "./EditEventContext";

export function FlightTrackingSettingsCard() {
  const {
    flightFilterMode,
    flightFilterBounds,
    showAllFlights,
    setFlightFilterMode,
    setFlightFilterBounds,
    setShowAllFlights,
  } = useEditEventContext();

  const [west, setWest] = useState("");
  const [south, setSouth] = useState("");
  const [east, setEast] = useState("");
  const [north, setNorth] = useState("");

  useEffect(() => {
    if (flightFilterBounds) {
      try {
        const arr = JSON.parse(flightFilterBounds);
        if (Array.isArray(arr) && arr.length === 4) {
          setWest(arr[0] !== undefined && arr[0] !== null ? String(arr[0]) : "");
          setSouth(arr[1] !== undefined && arr[1] !== null ? String(arr[1]) : "");
          setEast(arr[2] !== undefined && arr[2] !== null ? String(arr[2]) : "");
          setNorth(arr[3] !== undefined && arr[3] !== null ? String(arr[3]) : "");
        }
      } catch (e) {
        // ignore
      }
    } else {
      setWest("");
      setSouth("");
      setEast("");
      setNorth("");
    }
  }, [flightFilterBounds]);

  const updateBounds = (w: string, s: string, e: string, n: string) => {
    const coords = [parseFloat(w), parseFloat(s), parseFloat(e), parseFloat(n)];
    if (coords.some(isNaN)) {
      setFlightFilterBounds("");
    } else {
      setFlightFilterBounds(JSON.stringify(coords));
    }
  };

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Flight Tracking Settings</CardTitle>
        <CardDescription>
          Configure how flights are ingested and displayed on the event map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="flightFilterMode">Ingestion & Tracking Mode</Label>
          <Select
            value={flightFilterMode}
            onValueChange={(val) => setFlightFilterMode(val)}
          >
            <SelectTrigger id="flightFilterMode">
              <SelectValue placeholder="Select tracking mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Airports">Airport Bound (Hubs & Sub-Event Routes)</SelectItem>
              <SelectItem value="Region">Geographical Region (Bounding Box)</SelectItem>
              <SelectItem value="Global">Global Ingestion (Callsign-Only)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {flightFilterMode === "Airports" && "Only aircraft flying between the airports configured in sub-events will be displayed on the map."}
            {flightFilterMode === "Region" && "Tracks all flights (or matching callsigns) within a specified geographical coordinate bounding box."}
            {flightFilterMode === "Global" && "Tracks flights globally based strictly on matching callsign filters."}
          </p>
        </div>

        {flightFilterMode === "Region" && (
          <div className="space-y-2 border p-3 rounded bg-muted/20">
            <Label>Bounding Box Coordinates (Degrees Decimal)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="westCoord" className="text-xs">West Longitude</Label>
                <Input
                  id="westCoord"
                  type="text"
                  value={west}
                  onChange={(e) => {
                    setWest(e.target.value);
                    updateBounds(e.target.value, south, east, north);
                  }}
                  placeholder="-125.0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="eastCoord" className="text-xs">East Longitude</Label>
                <Input
                  id="eastCoord"
                  type="text"
                  value={east}
                  onChange={(e) => {
                    setEast(e.target.value);
                    updateBounds(west, south, e.target.value, north);
                  }}
                  placeholder="-65.0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="southCoord" className="text-xs">South Latitude</Label>
                <Input
                  id="southCoord"
                  type="text"
                  value={south}
                  onChange={(e) => {
                    setSouth(e.target.value);
                    updateBounds(west, e.target.value, east, north);
                  }}
                  placeholder="24.0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="northCoord" className="text-xs">North Latitude</Label>
                <Input
                  id="northCoord"
                  type="text"
                  value={north}
                  onChange={(e) => {
                    setNorth(e.target.value);
                    updateBounds(west, south, east, e.target.value);
                  }}
                  placeholder="49.0"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-row items-start space-x-3 space-y-0 rounded border p-3 bg-muted/10">
          <Checkbox
            id="showAllFlights"
            checked={showAllFlights}
            onCheckedChange={(checked) => setShowAllFlights(!!checked)}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="showAllFlights">Display All Regional Traffic</Label>
            <p className="text-xs text-muted-foreground">
              If checked, all active flights in the tracked zone are displayed (unmatched callsigns show as slate grey). If unchecked, only flights matching group callsign filters are shown.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Layers,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Minus,
  Circle,
  Square,
  Hexagon,
  Spline,
  Type,
} from "lucide-react";

const DRAW_TOOLS = [
  { id: "freehand", label: "Free", icon: Spline },
  { id: "line", label: "Line", icon: Minus },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rectangle", label: "Rect", icon: Square },
  { id: "polygon", label: "Poly", icon: Hexagon },
] as const;

interface LiveOverlayControllerProps {
  eventId: string;
  overlays: any[];
  isDrawingMode: boolean;
  setIsDrawingMode: (val: boolean) => void;
  strokeColor: string;
  setStrokeColor: (val: string) => void;
  drawTool: string;
  setDrawTool: (val: string) => void;
  drawLabel: string;
  setDrawLabel: (val: string) => void;
}

export const LiveOverlayController: React.FC<LiveOverlayControllerProps> = ({
  eventId,
  overlays,
  isDrawingMode,
  setIsDrawingMode,
  strokeColor,
  setStrokeColor,
  drawTool,
  setDrawTool,
  drawLabel,
  setDrawLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "kml" | "image" | "draw">("list");
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();

  // Image overlay inputs
  const [imageName, setImageName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [west, setWest] = useState("");
  const [south, setSouth] = useState("");
  const [east, setEast] = useState("");
  const [north, setNorth] = useState("");
  const [opacity, setOpacity] = useState(0.5);

  const handleKmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !connection) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      try {
        const geojson = parseKmlToGeoJson(text);
        if (geojson.features.length === 0) {
          toast.error("No valid line, polygon, or point features found in KML");
          return;
        }

        const config = JSON.stringify({
          opacity: 0.8,
          strokeColor: strokeColor || "#3B82F6",
          strokeWidth: 3,
        });

        await connection.reducers.addEventOverlay({
          eventId: BigInt(eventId),
          name: file.name.replace(".kml", ""),
          overlayType: "kml",
          data: JSON.stringify(geojson),
          config,
        });

        toast.success("KML overlay added successfully!");
        setActiveTab("list");
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse KML file");
      }
    };
    reader.readAsText(file);
  };

  const handleImageUploadAndSave = async () => {
    if (!connection) return;
    if (!imageName.trim()) {
      toast.error("Please enter a name for the overlay");
      return;
    }

    const coords = [parseFloat(west), parseFloat(south), parseFloat(east), parseFloat(north)];
    if (coords.some(isNaN)) {
      toast.error("Please enter valid bounds coordinates (West, South, East, North)");
      return;
    }

    setIsUploading(true);
    try {
      let finalUrl = imageUrl;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("title", imageName);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image file");
        }
        const data = await response.json();
        finalUrl = data.url;
      }

      if (!finalUrl) {
        toast.error("Please provide an image file or URL");
        return;
      }

      const bounds = [
        [coords[0], coords[3]],
        [coords[2], coords[3]],
        [coords[2], coords[1]],
        [coords[0], coords[1]],
      ];

      const config = JSON.stringify({
        bounds,
        opacity,
      });

      await connection.reducers.addEventOverlay({
        eventId: BigInt(eventId),
        name: imageName,
        overlayType: "image",
        data: finalUrl,
        config,
      });

      toast.success("Image overlay added successfully!");
      setImageName("");
      setImageUrl("");
      setImageFile(null);
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to add image overlay");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateOpacity = async (overlay: any, newOpacity: number) => {
    if (!connection) return;
    try {
      let configObj = {};
      try {
        configObj = JSON.parse(overlay.config);
      } catch (e) {
        // ignore
      }
      const updatedConfig = JSON.stringify({
        ...configObj,
        opacity: newOpacity,
      });
      await connection.reducers.updateEventOverlay({
        overlayId: overlay.overlayId,
        name: overlay.name,
        data: overlay.data,
        config: updatedConfig,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOverlay = async (overlayId: bigint) => {
    if (!connection) return;
    try {
      await connection.reducers.deleteEventOverlay({ overlayId });
      toast.success("Overlay deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete overlay");
    }
  };

  function parseKmlToGeoJson(kmlText: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, "text/xml");
    const features: any[] = [];

    const parseCoords = (str: string) => {
      return str
        .trim()
        .split(/\s+/)
        .map((coord) => {
          const parts = coord.split(",");
          return [parseFloat(parts[0]), parseFloat(parts[1])];
        })
        .filter((p) => !isNaN(p[0]) && !isNaN(p[1]));
    };

    const lineStrings = xmlDoc.getElementsByTagName("LineString");
    for (let i = 0; i < lineStrings.length; i++) {
      const coordsNode = lineStrings[i].getElementsByTagName("coordinates")[0];
      if (coordsNode && coordsNode.textContent) {
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: parseCoords(coordsNode.textContent),
          },
          properties: {
            name:
              lineStrings[i].parentElement?.getElementsByTagName("name")[0]
                ?.textContent || `Line ${i + 1}`,
          },
        });
      }
    }

    const polygons = xmlDoc.getElementsByTagName("Polygon");
    for (let i = 0; i < polygons.length; i++) {
      const outerBoundary = polygons[i].getElementsByTagName("outerBoundaryIs")[0];
      if (outerBoundary) {
        const coordsNode = outerBoundary.getElementsByTagName("coordinates")[0];
        if (coordsNode && coordsNode.textContent) {
          features.push({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [parseCoords(coordsNode.textContent)],
            },
            properties: {
              name:
                polygons[i].parentElement?.getElementsByTagName("name")[0]
                  ?.textContent || `Polygon ${i + 1}`,
            },
          });
        }
      }
    }

    const points = xmlDoc.getElementsByTagName("Point");
    for (let i = 0; i < points.length; i++) {
      const coordsNode = points[i].getElementsByTagName("coordinates")[0];
      if (coordsNode && coordsNode.textContent) {
        const coords = parseCoords(coordsNode.textContent);
        if (coords.length > 0) {
          features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: coords[0],
            },
            properties: {
              name:
                points[i].parentElement?.getElementsByTagName("name")[0]
                  ?.textContent || `Point ${i + 1}`,
            },
          });
        }
      }
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-24 right-4 z-50 rounded-full h-12 w-12 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Layers className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-24 right-4 z-50 w-80 shadow-2xl border-primary/20 max-h-[calc(100vh-7rem)] flex flex-col bg-background/95 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Overlays
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-2 pb-4 overflow-y-auto flex-1 min-h-0">
        {/* Navigation tabs */}
        <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-md text-xs sticky top-0 z-10">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-1 rounded text-center font-medium ${
              activeTab === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setActiveTab("draw")}
            className={`py-1 rounded text-center font-medium ${
              activeTab === "draw" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Draw
          </button>
          <button
            onClick={() => setActiveTab("kml")}
            className={`py-1 rounded text-center font-medium ${
              activeTab === "kml" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            KML
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`py-1 rounded text-center font-medium ${
              activeTab === "image" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Image
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "list" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Active Overlays</h4>
            {overlays.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No custom overlays active on this map.
              </p>
            ) : (
              <div className="space-y-2">
                {overlays.map((o) => {
                  let currentOpacity = 0.5;
                  try {
                    currentOpacity = JSON.parse(o.config).opacity ?? 0.5;
                  } catch (e) {}

                  return (
                    <div
                      key={o.overlayId.toString()}
                      className="flex flex-col border rounded p-2 bg-muted/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold truncate max-w-[150px]">{o.name}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-mono">
                          {o.overlayType}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteOverlay(o.overlayId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground shrink-0">Opacity:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={currentOpacity}
                          onChange={(e) => handleUpdateOpacity(o, parseFloat(e.target.value))}
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-[10px] font-mono shrink-0 w-6 text-right">
                          {Math.round(currentOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "draw" && (
          <div className="space-y-3 pt-1 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Drawing Tools</span>
              <Button
                size="sm"
                variant={isDrawingMode ? "destructive" : "default"}
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className="h-8 gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isDrawingMode ? "Stop" : "Draw"}
              </Button>
            </div>

            {/* Tool selector */}
            <div className="space-y-1">
              <Label className="text-xs">Tool</Label>
              <div className="grid grid-cols-5 gap-1">
                {DRAW_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      size="sm"
                      variant={drawTool === tool.id ? "default" : "outline"}
                      onClick={() => setDrawTool(tool.id)}
                      className="h-8 px-1 text-[10px] gap-1"
                      title={tool.label}
                    >
                      <Icon className="h-3 w-3" />
                      {tool.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-8 h-8 rounded border p-0.5 cursor-pointer shrink-0"
                />
                <Input
                  type="text"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            {/* Label input */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Type className="h-3 w-3" />
                Label (optional)
              </Label>
              <Input
                placeholder="Label shown on map"
                value={drawLabel}
                onChange={(e) => setDrawLabel(e.target.value)}
                className="h-8 text-xs"
                disabled={!isDrawingMode}
              />
            </div>

            {isDrawingMode && (
              <p className="text-[10px] text-muted-foreground">
                {drawTool === "freehand" && "Click and drag to draw freehand lines on the map."}
                {drawTool === "line" && "Click to place start, click again to place end."}
                {drawTool === "circle" && "Click center, drag outward to set radius."}
                {drawTool === "rectangle" && "Click and drag to draw a rectangle on the map."}
                {drawTool === "polygon" && "Click to add vertices, double-click to close shape."}
              </p>
            )}
          </div>
        )}

        {activeTab === "kml" && (
          <div className="space-y-3">
            <Label htmlFor="kml-file" className="text-xs font-semibold block">
              Import Google Earth KML
            </Label>
            <div className="flex items-center justify-center border border-dashed rounded-lg p-4 bg-muted/10 cursor-pointer hover:bg-muted/20 relative">
              <input
                id="kml-file"
                type="file"
                accept=".kml"
                onChange={handleKmlUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="text-center space-y-1">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-xs font-medium">Click to select .kml file</p>
                <p className="text-[9px] text-muted-foreground">
                  Supports custom paths, points, and target boundaries.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "image" && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px]">Overlay Name</Label>
              <Input
                placeholder="Tactical Map"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px]">Image File</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="h-8 text-[10px] py-1 cursor-pointer"
              />
            </div>

            <div className="text-center text-[10px] text-muted-foreground font-semibold">- OR -</div>

            <div className="space-y-1">
              <Label className="text-[10px]">Image URL</Label>
              <Input
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 bg-muted/30 p-2 rounded border space-y-2">
              <Label className="text-[10px] font-semibold">Image Bounding Box (Deg. Dec.)</Label>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">West Lng</span>
                  <Input
                    placeholder="-120.0"
                    value={west}
                    onChange={(e) => setWest(e.target.value)}
                    className="h-7 text-xs p-1"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">East Lng</span>
                  <Input
                    placeholder="-110.0"
                    value={east}
                    onChange={(e) => setEast(e.target.value)}
                    className="h-7 text-xs p-1"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">South Lat</span>
                  <Input
                    placeholder="30.0"
                    value={south}
                    onChange={(e) => setSouth(e.target.value)}
                    className="h-7 text-xs p-1"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">North Lat</span>
                  <Input
                    placeholder="40.0"
                    value={north}
                    onChange={(e) => setNorth(e.target.value)}
                    className="h-7 text-xs p-1"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full h-8 gap-1.5"
              onClick={handleImageUploadAndSave}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="h-3.5 w-3.5" />
                  Save Image Overlay
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

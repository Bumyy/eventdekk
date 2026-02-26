import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plane } from "lucide-react";
import { SubEventType } from "@/module_bindings";
import { uploadImage } from "@/api/apiService";
import { toast } from "sonner";
import { Infer } from "spacetimedb";

type SubEventType = Infer<typeof SubEventType>;

interface SubEventFormData {
  subEventType: SubEventType;
  name: string;
  description: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  hubIcao?: string;
  groupFlightDepartureIcao?: string;
  groupFlightArrivalIcao?: string;
  groupFlightRoute?: string;
  notes?: string;
}

interface EventFormData {
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  ifcEventLink?: string;
  bannerUrl?: string;
  subEvents: SubEventFormData[];
}

interface EventTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (eventData: EventFormData) => void;
}

export function EventTypeDialog({
  open,
  onOpenChange,
  onSubmit,
}: EventTypeDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ifcEventLink, setIfcEventLink] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [subEvents, setSubEvents] = useState<SubEventFormData[]>([]);
  const [expandedSubEvents, setExpandedSubEvents] = useState<number[]>([]);

  // Image upload related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Effect to create/revoke preview URL
  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      // If file is deselected, clear the preview
      setPreviewUrl(null);
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // File validation
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      // Max size (e.g., 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File size cannot exceed ${maxSize / 1024 / 1024}MB.`);
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAddSubEvent = () => {
    const newIndex = subEvents.length;
    const defaultStartTime = startDate ? new Date(startDate) : new Date();
    const defaultEndTime = new Date(defaultStartTime);
    defaultEndTime.setHours(defaultEndTime.getHours() + 2);

    setSubEvents([
      ...subEvents,
      {
        subEventType: { tag: "GroupFlight" } as SubEventType,
        name: "",
        description: "",
        scheduledStartTime: defaultStartTime,
        scheduledEndTime: defaultEndTime,
      },
    ]);
    setExpandedSubEvents((prev) => [...prev, newIndex]);
  };

  const handleRemoveSubEvent = (index: number) => {
    setSubEvents(subEvents.filter((_, i) => i !== index));
  };

  const handleUpdateSubEvent = (
    index: number,
    data: Partial<SubEventFormData>
  ) => {
    setSubEvents(
      subEvents.map((event, i) => (i === index ? { ...event, ...data } : event))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !startTime || !endTime) {
      toast.error("Please fill out all required fields");
      return;
    }

    // Upload image if selected
    let finalBannerUrl = bannerUrl;

    if (selectedFile) {
      try {
        setIsUploading(true);
        // Use the API service to upload the image
        finalBannerUrl = await uploadImage(
          selectedFile,
          name || "Event Banner"
        );
        toast.success("Banner image uploaded successfully!");
      } catch (error: any) {
        toast.error(`Image upload failed: ${error.message}`);
        setIsUploading(false);
        return; // Don't proceed if upload fails
      } finally {
        setIsUploading(false);
      }
    }

    const startDateTime = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(":");
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

    const endDateTime = new Date(endDate);
    const [endHours, endMinutes] = endTime.split(":");
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

    onSubmit({
      name,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      ifcEventLink: ifcEventLink || undefined,
      bannerUrl: finalBannerUrl || undefined,
      subEvents: subEvents.map((event) => ({
        ...event,
        scheduledStartTime: event.scheduledStartTime,
        scheduledEndTime: event.scheduledEndTime,
      })),
    });

    // Reset form fields
    setName("");
    setDescription("");
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime("");
    setEndTime("");
    setIfcEventLink("");
    setBannerUrl("");
    setSubEvents([]);
    setExpandedSubEvents([]);
    setSelectedFile(null);
    setPreviewUrl(null);

    onOpenChange(false);
  };

  const toggleSubEventExpansion = (index: number) => {
    setExpandedSubEvents((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const getEventTypeBadge = (type: SubEventType) => {
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
  };

  return (
    <>
      {" "}
      {/* Add a backdrop div that animates blur and covers the header */}
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-all duration-200 z-[49] ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Create a main event and add sub-events of different types.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Event Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Main Event Details</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter event description"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifcEventLink">IFC Event Link (Optional)</Label>
                <Input
                  id="ifcEventLink"
                  value={ifcEventLink}
                  onChange={(e) => setIfcEventLink(e.target.value)}
                  placeholder="Enter IFC event link"
                />
              </div>

              {/* Banner Image Upload Section */}
              <div className="space-y-2">
                <Label>Banner Image</Label>

                {/* Preview image if available */}
                {(previewUrl || bannerUrl) && (
                  <div className="mb-2 relative">
                    <div className="rounded-md overflow-hidden border border-border">
                      <img
                        src={previewUrl || bannerUrl}
                        alt="Event Banner Preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      id="bannerImageFile"
                      type="file"
                      accept="image/jpeg, image/png, image/webp, image/gif"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="flex-1 file:mr-4 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                  </div>

                  {!selectedFile && (
                    <div className="space-y-2 flex-1">
                      <Input
                        id="bannerUrl"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="Or enter image URL directly"
                        disabled={!!selectedFile || isUploading}
                      />
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Max 5MB. JPG, PNG, WEBP, GIF accepted.
                </p>
              </div>
            </div>

            {/* Sub Events */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sub Events</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubEvent}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sub Event
                </Button>
              </div>

              <div className="space-y-4">
                {subEvents.map((subEvent, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Event Type</Label>
                          {getEventTypeBadge(subEvent.subEventType)}
                        </div>
                        {expandedSubEvents.includes(index) && (
                          <RadioGroup
                            value={subEvent.subEventType.tag}
                            onValueChange={(value: string) =>
                              handleUpdateSubEvent(index, {
                                subEventType:
                                  value === "GroupFlight"
                                    ? ({ tag: "GroupFlight" } as SubEventType)
                                    : value === "FlyIn"
                                      ? ({ tag: "FlyIn" } as SubEventType)
                                      : ({ tag: "FlyOut" } as SubEventType),
                              })
                            }
                            className="grid grid-cols-3 gap-4"
                          >
                            <div>
                              <RadioGroupItem
                                value="GroupFlight"
                                id={`group-flight-${index}`}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={`group-flight-${index}`}
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span className="text-sm font-medium">
                                  Group Flight
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  A to B
                                </span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem
                                value="FlyIn"
                                id={`fly-in-${index}`}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={`fly-in-${index}`}
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span className="text-sm font-medium">
                                  Fly-in
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  To A
                                </span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem
                                value="FlyOut"
                                id={`fly-out-${index}`}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={`fly-out-${index}`}
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span className="text-sm font-medium">
                                  Fly-out
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  From A
                                </span>
                              </Label>
                            </div>
                          </RadioGroup>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSubEventExpansion(index)}
                        >
                          {expandedSubEvents.includes(index) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSubEvent(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {!expandedSubEvents.includes(index) && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {subEvent.name || "Untitled Event"}
                          </h4>
                          <span className="text-muted-foreground">•</span>
                          {subEvent.subEventType.tag === "GroupFlight" &&
                            subEvent.groupFlightDepartureIcao &&
                            subEvent.groupFlightArrivalIcao && (
                              <span className="text-sm text-muted-foreground">
                                {subEvent.groupFlightDepartureIcao} →{" "}
                                {subEvent.groupFlightArrivalIcao}
                              </span>
                            )}
                          {subEvent.subEventType.tag === "FlyIn" &&
                            subEvent.hubIcao && (
                              <span className="text-sm text-muted-foreground">
                                To: {subEvent.hubIcao}
                              </span>
                            )}
                          {subEvent.subEventType.tag === "FlyOut" &&
                            subEvent.hubIcao && (
                              <span className="text-sm text-muted-foreground">
                                From: {subEvent.hubIcao}
                              </span>
                            )}
                        </div>
                        {subEvent.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {subEvent.description}
                          </p>
                        )}
                      </div>
                    )}

                    {expandedSubEvents.includes(index) && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`sub-name-${index}`}>Name</Label>
                          <Input
                            id={`sub-name-${index}`}
                            value={subEvent.name}
                            onChange={(e) =>
                              handleUpdateSubEvent(index, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Enter sub-event name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`sub-description-${index}`}>
                            Description
                          </Label>
                          <Textarea
                            id={`sub-description-${index}`}
                            value={subEvent.description}
                            onChange={(e) =>
                              handleUpdateSubEvent(index, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Enter sub-event description"
                          />
                        </div>

                        {subEvent.subEventType.tag === "GroupFlight" && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor={`departure-${index}`}>
                                Departure ICAO
                              </Label>
                              <Input
                                id={`departure-${index}`}
                                value={subEvent.groupFlightDepartureIcao}
                                onChange={(e) =>
                                  handleUpdateSubEvent(index, {
                                    groupFlightDepartureIcao: e.target.value,
                                  })
                                }
                                placeholder="Enter departure ICAO"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`arrival-${index}`}>
                                Arrival ICAO
                              </Label>
                              <Input
                                id={`arrival-${index}`}
                                value={subEvent.groupFlightArrivalIcao}
                                onChange={(e) =>
                                  handleUpdateSubEvent(index, {
                                    groupFlightArrivalIcao: e.target.value,
                                  })
                                }
                                placeholder="Enter arrival ICAO"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`route-${index}`}>
                                Route (Optional)
                              </Label>
                              <Input
                                id={`route-${index}`}
                                value={subEvent.groupFlightRoute}
                                onChange={(e) =>
                                  handleUpdateSubEvent(index, {
                                    groupFlightRoute: e.target.value,
                                  })
                                }
                                placeholder="Enter route"
                              />
                            </div>
                          </>
                        )}

                        {(subEvent.subEventType.tag === "FlyIn" ||
                          subEvent.subEventType.tag === "FlyOut") && (
                          <div className="space-y-2">
                            <Label htmlFor={`hub-${index}`}>Hub ICAO</Label>
                            <Input
                              id={`hub-${index}`}
                              value={subEvent.hubIcao}
                              onChange={(e) =>
                                handleUpdateSubEvent(index, {
                                  hubIcao: e.target.value,
                                })
                              }
                              placeholder="Enter hub ICAO"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor={`notes-${index}`}>
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id={`notes-${index}`}
                            value={subEvent.notes}
                            onChange={(e) =>
                              handleUpdateSubEvent(index, {
                                notes: e.target.value,
                              })
                            }
                            placeholder="Enter notes"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

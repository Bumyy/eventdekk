import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useEvents,
  useSubEvents,
  useGroups,
  useFlightSignups,
} from "@/hooks/spacetimeHooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  MapPin,
  Plane,
  ChevronDown,
  Plus,
  X,
  Trash2,
  Loader2,
  Upload,
  Clock,
  Check,
  Users,
  CheckCircle2,
  Calendar as CalendarIcon2,
  Send,
} from "lucide-react";
import { SenderError, Timestamp } from "spacetimedb";
import { EventStatus, Event, SubEventType } from "@/module_bindings/types";
import { uploadImage } from "@/api/apiService";
import { useSpacetimeDB } from "spacetimedb/react";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
  formatDateTimeInTimezone,
  useUserTimezone,
} from "@/utils/timezoneUtils";

export default function EditEvent() {
  const { eventId, groupId } = useParams();
  const navigate = useNavigate();
  const events = useEvents();
  const subEvents = useSubEvents();
  const groups = useGroups();
  const flightSignups = useFlightSignups();
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const userTimezone = useUserTimezone();

  // Event data states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [ifcEventLink, setIfcEventLink] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);

  // Image upload related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // UI states
  const [showAddSubEventDialog, setShowAddSubEventDialog] = useState(false);
  const [showInviteGroupsDialog, setShowInviteGroupsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<
    { id: bigint; name: string }[]
  >([]);

  // Sub-event form state
  const [subEventForm, setSubEventForm] = useState({
    name: "",
    description: "",
    type: "GroupFlight" as "GroupFlight" | "FlyIn" | "FlyOut",
    startTime: new Date(),
    endTime: new Date(),
    hubIcao: "",
    departureIcao: "",
    arrivalIcao: "",
    route: "",
    notes: "",
  });

  // New state for managing own flights dialog
  const [showManageOwnFlightsDialog, setShowManageOwnFlightsDialog] =
    useState(false);
  const [selectedOwnSubEvents, setSelectedOwnSubEvents] = useState<bigint[]>(
    []
  );
  const [ownFlightDetails, setOwnFlightDetails] = useState<Record<string, any>>(
    {}
  );
  const [isSubmittingFlights, setIsSubmittingFlights] = useState(false);

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

  // Load event data
  useEffect(() => {
    if (!events || !eventId || events.length === 0) return;
    const event = events.find((e: Event) => e.eventId.toString() === eventId);
    if (!event) {
      toast.error("Event not found", {
        description: "The requested event could not be found.",
      });
      navigate(`/admin/events/${groupId}`);
      return;
    }

    setName(event.name);
    setDescription(event.description);
    setStartTime(event.startTime.toDate());
    setEndTime(event.endTime.toDate());
    setIfcEventLink(event.ifcEventLink || "");
    setBannerUrl(event.bannerUrl || "");
    setEventStatus(event.status);
  }, [events, eventId, navigate]);

  // Get sub events for this event
  const eventSubEvents = subEvents.filter(
    (se) => se.eventId.toString() === eventId
  );

  // Get signups related to this event's sub-events
  const eventSignups = flightSignups.filter((signup) =>
    eventSubEvents.some((subEvent) => subEvent.subEventId === signup.subEventId)
  );

  // Group signups by sub-event
  const signupsBySubEvent = eventSubEvents.reduce(
    (acc, subEvent) => {
      acc[subEvent.subEventId.toString()] = eventSignups.filter(
        (signup) => signup.subEventId === subEvent.subEventId
      );
      return acc;
    },
    {} as Record<string, typeof flightSignups>
  );

  // Load existing own flight signups
  useEffect(() => {
    if (!flightSignups || !eventId || !groupId) return;

    // Find sub-events related to this event
    const thisEventSubEvents = subEvents.filter(
      (se) => se.eventId.toString() === eventId
    );

    // Find signups by this group for this event's sub-events
    const ownSignups = flightSignups.filter(
      (signup) =>
        signup.groupId === BigInt(groupId) &&
        thisEventSubEvents.some((se) => se.subEventId === signup.subEventId)
    );

    // Extract selected sub-events and flight details
    if (ownSignups.length > 0) {
      const signedUpSubEventIds = ownSignups.map((signup) => signup.subEventId);
      setSelectedOwnSubEvents(signedUpSubEventIds);

      // Populate flight details from existing signups
      const detailsMap: Record<string, any> = {};
      ownSignups.forEach((signup) => {
        detailsMap[signup.subEventId.toString()] = {
          callsign: signup.callsign || "",
          aircraftType: signup.aircraftType || "",
          departureTime: signup.desiredDepartureTime
            ? format(signup.desiredDepartureTime.toDate(), "yyyy-MM-dd'T'HH:mm")
            : "",
          arrivalTime: signup.desiredArrivalTime
            ? format(signup.desiredArrivalTime.toDate(), "yyyy-MM-dd'T'HH:mm")
            : "",
          route: signup.routeDetails || "",
          customDepartureIcao: signup.departureIcao || "",
          customArrivalIcao: signup.arrivalIcao || "",
        };
      });
      setOwnFlightDetails(detailsMap);
    }
  }, [flightSignups, subEvents, eventId, groupId]);

  // Handle toggling sub-event selection for own flights
  const handleToggleOwnSubEvent = (subEventId: bigint) => {
    setSelectedOwnSubEvents((prev) => {
      if (prev.some((id) => id === subEventId)) {
        // Remove if already selected
        return prev.filter((id) => id !== subEventId);
      } else {
        // Add if not selected
        return [...prev, subEventId];
      }
    });

    // Initialize flight details for this sub-event if not already done
    const subEvent = subEvents.find((se) => se.subEventId === subEventId);
    if (subEvent) {
      setOwnFlightDetails((prev) => {
        if (!prev[subEventId.toString()]) {
          // Initialize with defaults based on sub-event type
          const details = {
            callsign: "",
            aircraftType: "",
            route: "",
            customDepartureIcao: "",
            customArrivalIcao: "",
          };

          return {
            ...prev,
            [subEventId.toString()]: details,
          };
        }
        return prev;
      });
    }
  };

  // Update flight details for own flights
  const updateOwnFlightDetail = (
    subEventId: string,
    field: string,
    value: string
  ) => {
    setOwnFlightDetails((prev) => ({
      ...prev,
      [subEventId]: {
        ...prev[subEventId],
        [field]: value,
      },
    }));
  };

  // Submit own flight signups
  const handleSubmitOwnFlights = async () => {
    if (!connection || !eventId || !groupId) return;

    setIsSubmittingFlights(true);

    try {
      // Get existing signups for this event by this group
      const thisEventSubEvents = subEvents.filter(
        (se) => se.eventId.toString() === eventId
      );
      const existingSignups = flightSignups.filter(
        (signup) =>
          signup.groupId === BigInt(groupId) &&
          thisEventSubEvents.some((se) => se.subEventId === signup.subEventId)
      );

      // Determine which to add and which to remove
      const subEventsToRemove = existingSignups.filter(
        (signup) => !selectedOwnSubEvents.includes(signup.subEventId)
      );

      // Remove signups that are no longer selected
      for (const signup of subEventsToRemove) {
        try {
          await connection.reducers.deleteFlightSignup({
            signupId: signup.signupId,
          });
        } catch (error) {
          if (error instanceof SenderError) {
            toast.error("Error removing flight signup", {
              description: `${error.message}`,
            });
          } else {
            toast.error("Error removing flight signup", {
              description: "There was a problem removing your flight signup.",
            });
          }
        }
      }

      // Add new signups and update existing ones
      for (const subEventId of selectedOwnSubEvents) {
        const details = ownFlightDetails[subEventId.toString()];
        if (!details) continue;

        // Check if we need to update or add
        const existingSignup = existingSignups.find(
          (signup) => signup.subEventId === subEventId
        );

        // Get the subEvent for type-specific data
        const subEvent = subEvents.find((se) => se.subEventId === subEventId);
        if (!subEvent) continue;

        // Prepare parameters based on sub-event type
        const isGroupFlight = subEvent.subEventType.tag === "GroupFlight";
        const isFlyIn = subEvent.subEventType.tag === "FlyIn";
        const isFlyOut = subEvent.subEventType.tag === "FlyOut";

        // Determine departure and arrival airports based on sub-event type
        let departureIcao = "";
        let arrivalIcao = "";

        if (isGroupFlight) {
          departureIcao = subEvent.groupFlightDepartureIcao || "";
          arrivalIcao = subEvent.groupFlightArrivalIcao || "";
        } else if (isFlyIn) {
          departureIcao = details.customDepartureIcao || "";
          arrivalIcao = subEvent.hubIcao || "";
        } else if (isFlyOut) {
          departureIcao = subEvent.hubIcao || "";
          arrivalIcao = details.customArrivalIcao || "";
        }

        console.log("Departure ICAO:", departureIcao);
        console.log("Arrival ICAO:", arrivalIcao);

        // Parse dates
        let departureTime = null;
        let arrivalTime = null;

        if (details.departureTime) {
          departureTime = Timestamp.fromDate(new Date(details.departureTime));
        }

        if (details.arrivalTime) {
          arrivalTime = Timestamp.fromDate(new Date(details.arrivalTime));
        }

        if (existingSignup) {
          // Update existing signup
          try {
            await connection.reducers.updateFlightSignup({
              signupId: existingSignup.signupId,
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || undefined,
              callsign: details.callsign || null,
              aircraftType: details.aircraftType || null,
              desiredDepartureTime: departureTime || undefined,
              desiredArrivalTime: arrivalTime || undefined,
            });
          } catch (error) {
            if (error instanceof SenderError) {
              toast.error("Error updating flight signup", {
                description: `${error.message}`,
              });
            } else {
              toast.error("Error updating flight signup", {
                description: "There was a problem updating your flight signup.",
              });
            }
          }
        } else {
          // Add new signup
          try {
            await connection.reducers.signupForFlight({
              subEventId: subEventId,
              groupId: BigInt(groupId),
              departureIcao: departureIcao,
              arrivalIcao: arrivalIcao,
              routeDetails: details.route || undefined,
              callsign: details.callsign || null,
              aircraftType: details.aircraftType || null,
              desiredDepartureTime: departureTime || undefined,
              desiredArrivalTime: arrivalTime || undefined,
            });
          } catch (error) {
            if (error instanceof SenderError) {
              toast.error("Error signing up for flight", {
                description: `${error.message}`,
              });
            } else {
              toast.error("Error signing up for flight", {
                description: "There was a problem signing up for the flight.",
              });
            }
          }
        }
      }

      toast.success("Flight signups updated", {
        description: "Your flight details have been saved successfully.",
      });

      setShowManageOwnFlightsDialog(false);
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error saving flight details", {
          description: `${error.message}`,
        });
      } else {
        console.error("Error submitting flights:", error);
        toast.error("Error saving flight details", {
          description: "There was a problem updating your flight signups.",
        });
      }
    } finally {
      setIsSubmittingFlights(false);
    }
  };

  const handleUpdateEvent = async (publish: boolean = false) => {
    if (!connection || !eventId) return;

    setIsLoading(true);

    // Upload image if a new one is selected
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
      } catch (error: unknown) {
        toast.error(`Image upload failed: ${(error as Error).message}`);
        setIsLoading(false);
        return; // Don't proceed if upload fails
      } finally {
        setIsUploading(false);
      }
    }

    // If publishing, set to Published. Otherwise, keep the current status
    const newStatus = publish ? EventStatus.Published : eventStatus;

    try {
      await connection.reducers.updateEvent({
        eventId: BigInt(eventId),
        name: name,
        description: description,
        startTime: startTime ? Timestamp.fromDate(startTime) : null,
        endTime: endTime ? Timestamp.fromDate(endTime) : null,
        ifcEventLink: ifcEventLink || null,
        bannerUrl: finalBannerUrl || null,
        status: newStatus,
      });

      // Update local state with the new banner URL and status
      setBannerUrl(finalBannerUrl);
      setSelectedFile(null);
      setEventStatus(newStatus);

      toast.success(publish ? "Event published!" : "Event saved as draft", {
        description: publish
          ? "Your event is now visible to everyone."
          : "Your changes have been saved as draft.",
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error updating event", {
          description: `${error.message}`,
        });
      }

      console.error("Error updating event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubEvent = async () => {
    if (!connection || !eventId) return;

    let subEventType: SubEventType;
    switch (subEventForm.type) {
      case "GroupFlight":
        subEventType = { tag: "GroupFlight" };
        break;
      case "FlyIn":
        subEventType = { tag: "FlyIn" };
        break;
      case "FlyOut":
        subEventType = { tag: "FlyOut" };
        break;
    }

    try {
      await connection.reducers.addSubEvent({
        eventId: BigInt(eventId),
        name: subEventForm.name,
        description: subEventForm.description,
        subEventType: subEventType,
        scheduledStartTime: Timestamp.fromDate(subEventForm.startTime),
        scheduledEndTime: Timestamp.fromDate(subEventForm.endTime),
        hubIcao:
          subEventForm.type === "FlyIn" || subEventForm.type === "FlyOut"
            ? subEventForm.hubIcao
            : undefined,
        groupFlightDepartureIcao:
          subEventForm.type === "GroupFlight"
            ? subEventForm.departureIcao
            : undefined,
        groupFlightArrivalIcao:
          subEventForm.type === "GroupFlight"
            ? subEventForm.arrivalIcao
            : undefined,
        groupFlightRoute:
          subEventForm.type === "GroupFlight" ? subEventForm.route : undefined,
        notes: subEventForm.notes || undefined,
      });

      setShowAddSubEventDialog(false);
      setSubEventForm({
        name: "",
        description: "",
        type: "GroupFlight",
        startTime: new Date(),
        endTime: new Date(),
        hubIcao: "",
        departureIcao: "",
        arrivalIcao: "",
        route: "",
        notes: "",
      });

      toast.success("Sub-event added", {
        description: "The sub-event was added successfully.",
      });
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error adding sub-event", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error adding sub-event", {
          description: "There was a problem adding the sub-event.",
        });
      }
      console.error("Error adding sub-event:", error);
    }
  };

  const handleDeleteSubEvent = async (subEventId: bigint) => {
    if (!connection) return;
    if (confirm("Are you sure you want to delete this sub-event?")) {
      try {
        await connection.reducers.deleteSubEvent({ subEventId: subEventId });
        toast.success("Sub-event deleted", {
          description: "The sub-event was deleted successfully.",
        });
      } catch (error) {
        if (error instanceof SenderError) {
          toast.error("Error deleting sub-event", {
            description: `${error.message}`,
          });
        } else {
          toast.error("Error deleting sub-event", {
            description: "There was a problem deleting the sub-event.",
          });
        }
        console.error("Error deleting sub-event:", error);
      }
    }
  };

  const handleSelectGroup = (group: { id: bigint; name: string }) => {
    const exists = selectedGroups.some((g) => g.id === group.id);
    if (!exists) {
      setSelectedGroups((prev) => [...prev, group]);
    }
  };

  const handleRemoveGroup = (groupId: bigint) => {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleInviteGroups = async () => {
    if (!connection || !eventId) return;

    const eventIdBigInt = BigInt(eventId);

    try {
      await Promise.all(
        selectedGroups.map((group) =>
          connection.reducers.inviteGroupToEvent({
            eventId: eventIdBigInt,
            invitedGroupId: group.id,
          })
        )
      );

      toast.success("Groups invited", {
        description: `Successfully invited ${selectedGroups.length} group(s) to the event.`,
      });
      setSelectedGroups([]);
      setShowInviteGroupsDialog(false);
    } catch (error) {
      if (error instanceof SenderError) {
        toast.error("Error inviting groups", {
          description: `${error.message}`,
        });
      } else {
        toast.error("Error inviting groups", {
          description: "There was a problem inviting groups to the event.",
        });
      }
      console.error("Error inviting groups:", error);
    }
  };

  const getSubEventTypeBadge = (type: SubEventType) => {
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

  if (!startTime || !endTime) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/events/${groupId}`)}
          >
            Cancel
          </Button>
          {eventStatus?.tag === "Draft" && (
            <Button
              variant="default"
              onClick={() => handleUpdateEvent(true)}
              disabled={isLoading || isUploading}
            >
              {isLoading || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publish Event
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => handleUpdateEvent(false)}
            disabled={isLoading || isUploading}
          >
            {isLoading || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : eventStatus?.tag === "Draft" ? (
              "Save as Draft"
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      <Card className="py-4">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Basic information about the event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter event name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter event description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateTimePicker
              label="Start Time"
              value={startTime}
              onChange={(date) => setStartTime(date || null)}
              placeholder={
                startTime
                  ? formatDateTimeInTimezone(startTime, userTimezone)
                  : "Select date and time"
              }
            />

            <DateTimePicker
              label="End Time"
              value={endTime}
              onChange={(date) => setEndTime(date || null)}
              placeholder={
                endTime
                  ? formatDateTimeInTimezone(endTime, userTimezone)
                  : "Select date and time"
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifcEventLink">IFC Event Link (Optional)</Label>
            <Input
              id="ifcEventLink"
              value={ifcEventLink}
              onChange={(e) => setIfcEventLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Banner Image Section */}
          <div className="space-y-2">
            <Label>Banner Image</Label>

            {/* Preview image if available */}
            {(previewUrl || bannerUrl) && (
              <div className="mb-4 relative rounded-md overflow-hidden border border-border">
                <img
                  src={previewUrl || bannerUrl}
                  alt="Event Banner Preview"
                  className="w-full h-[200px] object-cover"
                />
                <div className="absolute bottom-0 right-0 p-2">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/60 hover:bg-background/80"
                    onClick={() => {
                      setSelectedFile(null);
                      if (!previewUrl) setBannerUrl("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label
                  htmlFor="bannerImageFile"
                  className="text-sm font-medium mb-2 block"
                >
                  Upload New Banner
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="bannerImageFile"
                    type="file"
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    onChange={handleFileChange}
                    disabled={isUploading || isLoading}
                    className="flex-1 file:mr-4 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {!isUploading && !selectedFile && (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <Label htmlFor="bannerUrl">Or Enter Image URL Directly</Label>
                <Input
                  id="bannerUrl"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={!!selectedFile || isUploading || isLoading}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Max 5MB. JPG, PNG, WEBP, GIF accepted.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sub-Events</CardTitle>
            <CardDescription>
              Manage the sub-events for this event
            </CardDescription>
          </div>
          <Dialog
            open={showAddSubEventDialog}
            onOpenChange={setShowAddSubEventDialog}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Sub-Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add Sub-Event</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4 p-1">
                  <div className="space-y-2">
                    <Label htmlFor="subEventName">Name</Label>
                    <Input
                      id="subEventName"
                      value={subEventForm.name}
                      onChange={(e) =>
                        setSubEventForm({
                          ...subEventForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter sub-event name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subEventType">Type</Label>
                    <Select
                      value={subEventForm.type}
                      onValueChange={(
                        value: "GroupFlight" | "FlyIn" | "FlyOut"
                      ) => setSubEventForm({ ...subEventForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="GroupFlight">
                            Group Flight
                          </SelectItem>
                          <SelectItem value="FlyIn">Fly-In</SelectItem>
                          <SelectItem value="FlyOut">Fly-Out</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subEventDescription">Description</Label>
                    <Textarea
                      id="subEventDescription"
                      value={subEventForm.description}
                      onChange={(e) =>
                        setSubEventForm({
                          ...subEventForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter sub-event description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DateTimePicker
                      label="Start Time"
                      value={subEventForm.startTime}
                      onChange={(date) =>
                        date &&
                        setSubEventForm({
                          ...subEventForm,
                          startTime: date,
                        })
                      }
                      placeholder={formatDateTimeInTimezone(
                        subEventForm.startTime,
                        userTimezone
                      )}
                    />

                    <DateTimePicker
                      label="End Time"
                      value={subEventForm.endTime}
                      onChange={(date) =>
                        date &&
                        setSubEventForm({
                          ...subEventForm,
                          endTime: date,
                        })
                      }
                      placeholder={formatDateTimeInTimezone(
                        subEventForm.endTime,
                        userTimezone
                      )}
                    />
                  </div>

                  {subEventForm.type === "FlyIn" ||
                  subEventForm.type === "FlyOut" ? (
                    <div className="space-y-2">
                      <Label htmlFor="hubIcao">Hub ICAO</Label>
                      <Input
                        id="hubIcao"
                        value={subEventForm.hubIcao}
                        onChange={(e) =>
                          setSubEventForm({
                            ...subEventForm,
                            hubIcao: e.target.value,
                          })
                        }
                        placeholder="KJFK"
                      />
                    </div>
                  ) : subEventForm.type === "GroupFlight" ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="departureIcao">Departure ICAO</Label>
                          <Input
                            id="departureIcao"
                            value={subEventForm.departureIcao}
                            onChange={(e) =>
                              setSubEventForm({
                                ...subEventForm,
                                departureIcao: e.target.value,
                              })
                            }
                            placeholder="KJFK"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="arrivalIcao">Arrival ICAO</Label>
                          <Input
                            id="arrivalIcao"
                            value={subEventForm.arrivalIcao}
                            onChange={(e) =>
                              setSubEventForm({
                                ...subEventForm,
                                arrivalIcao: e.target.value,
                              })
                            }
                            placeholder="KLAX"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="route">Flight Route (Optional)</Label>
                        <Input
                          id="route"
                          value={subEventForm.route}
                          onChange={(e) =>
                            setSubEventForm({
                              ...subEventForm,
                              route: e.target.value,
                            })
                          }
                          placeholder="KJFK DCT KBOS DCT KLAX"
                        />
                      </div>
                    </>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={subEventForm.notes}
                      onChange={(e) =>
                        setSubEventForm({
                          ...subEventForm,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Any additional information"
                      rows={2}
                    />
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddSubEventDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddSubEvent}>Add Sub-Event</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {eventSubEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventSubEvents.map((subEvent) => {
                const subEventSignups =
                  signupsBySubEvent[subEvent.subEventId.toString()] || [];
                const acceptedSignups = subEventSignups.filter(
                  (signup) => !!signup.desiredDepartureTime
                );
                const isGroupFlight =
                  subEvent.subEventType.tag === "GroupFlight";
                const isFlyIn = subEvent.subEventType.tag === "FlyIn";
                const isFlyOut = subEvent.subEventType.tag === "FlyOut";

                return (
                  <Card key={subEvent.subEventId} className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      {getSubEventTypeBadge(subEvent.subEventType)}
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Users className="h-3 w-3" />
                          {acceptedSignups.length} / {subEventSignups.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleDeleteSubEvent(subEvent.subEventId)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-medium">{subEvent.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {subEvent.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {formatDateInTimezone(
                          subEvent.scheduledStartTime.toDate(),
                          userTimezone
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {formatTimeInTimezone(
                          subEvent.scheduledStartTime.toDate(),
                          userTimezone
                        )}
                      </span>
                      {isGroupFlight &&
                        subEvent.groupFlightDepartureIcao &&
                        subEvent.groupFlightArrivalIcao && (
                          <>
                            <span>•</span>
                            <span>
                              {subEvent.groupFlightDepartureIcao} →{" "}
                              {subEvent.groupFlightArrivalIcao}
                            </span>
                          </>
                        )}
                      {isFlyIn && subEvent.hubIcao && (
                        <>
                          <span>•</span>
                          <span>To: {subEvent.hubIcao}</span>
                        </>
                      )}
                      {isFlyOut && subEvent.hubIcao && (
                        <>
                          <span>•</span>
                          <span>From: {subEvent.hubIcao}</span>
                        </>
                      )}
                    </div>

                    {subEventSignups.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="text-sm font-medium mb-2">Signups</h5>
                        <div className="space-y-3">
                          {subEventSignups.map((signup) => {
                            const group = groups.find(
                              (g) => g.groupId === signup.groupId
                            );
                            const groupTag = group?.tag || "N/A";
                            const groupLogo = group?.logoUrl;
                            const isAccepted = !!signup.desiredDepartureTime;

                            // Format departure/arrival times if available
                            const departureTime = signup.desiredDepartureTime
                              ? formatDateTimeInTimezone(
                                  signup.desiredDepartureTime.toDate(),
                                  userTimezone
                                )
                              : null;
                            const arrivalTime = signup.desiredArrivalTime
                              ? formatDateTimeInTimezone(
                                  signup.desiredArrivalTime.toDate(),
                                  userTimezone
                                )
                              : null;

                            return (
                              <div
                                key={signup.signupId.toString()}
                                className="border border-border rounded-md p-3"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    {groupLogo ? (
                                      <img
                                        src={groupLogo}
                                        alt={groupTag}
                                        className="h-6 w-6 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-6 w-6 bg-muted rounded-sm flex items-center justify-center text-xs">
                                        {groupTag.slice(0, 2)}
                                      </div>
                                    )}
                                    <span className="font-medium">
                                      {groupTag}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={isAccepted ? "default" : "outline"}
                                  >
                                    <>
                                      <Check className="h-3 w-3" /> Accepted
                                    </>
                                  </Badge>
                                </div>

                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {/* Show different information based on sub-event type */}
                                  {isGroupFlight && (
                                    <>
                                      {departureTime && (
                                        <div>Departure: {departureTime}</div>
                                      )}
                                    </>
                                  )}

                                  {isFlyIn && (
                                    <>
                                      {signup.departureIcao && (
                                        <div>From: {signup.departureIcao}</div>
                                      )}
                                      {arrivalTime && (
                                        <div>Arrival: {arrivalTime}</div>
                                      )}
                                    </>
                                  )}

                                  {isFlyOut && (
                                    <>
                                      {signup.arrivalIcao && (
                                        <div>To: {signup.arrivalIcao}</div>
                                      )}
                                      {departureTime && (
                                        <div>Departure: {departureTime}</div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No sub-events. Add one to get started!
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invite Groups</CardTitle>
            <CardDescription>
              Invite other groups to participate in this event
            </CardDescription>
          </div>
          <Dialog
            open={showInviteGroupsDialog}
            onOpenChange={setShowInviteGroupsDialog}
          >
            <DialogTrigger asChild>
              <Button>Invite Groups</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Groups to Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Selected Groups</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroups.map((group) => (
                      <Badge
                        key={group.id.toString()}
                        className="pr-1 flex items-center gap-1"
                      >
                        {group.name}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => handleRemoveGroup(group.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {selectedGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No groups selected
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Add Groups</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        Select Groups
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px]" align="start">
                      <ScrollArea className="h-[300px]">
                        {groups
                          ?.filter(
                            (group) =>
                              groupId && group.groupId !== BigInt(groupId)
                          ) // Don't include current group
                          .map((group) => (
                            <DropdownMenuItem
                              key={group.groupId.toString()}
                              onClick={() =>
                                handleSelectGroup({
                                  id: group.groupId,
                                  name: group.name,
                                })
                              }
                            >
                              {group.name}
                            </DropdownMenuItem>
                          ))}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteGroupsDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteGroups}
                  disabled={selectedGroups.length === 0}
                >
                  Send Invites
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Invite other groups to participate in this event. They will receive
            a notification and can choose to accept or decline the invitation.
          </p>
        </CardContent>
      </Card>

      {/* New card for managing own flights */}
      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Own Flights</CardTitle>
            <CardDescription>
              Sign up your own group for the event's sub-events
            </CardDescription>
          </div>
          <Dialog
            open={showManageOwnFlightsDialog}
            onOpenChange={setShowManageOwnFlightsDialog}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <Plane className="h-4 w-4 mr-1" />
                {selectedOwnSubEvents.length > 0
                  ? "Edit Flight Details"
                  : "Sign Up for Flights"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Own Flight Participation</DialogTitle>
                <DialogDescription>
                  Select which sub-events your group will participate in
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="pr-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">
                      Select Sub-Events to Join
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose which sub-events your group will participate in and
                      provide the necessary flight details.
                    </p>
                  </div>

                  {eventSubEvents.map((subEvent) => {
                    const isSelected = selectedOwnSubEvents.some(
                      (id) => id === subEvent.subEventId
                    );
                    const isGroupFlight =
                      subEvent.subEventType.tag === "GroupFlight";
                    const isFlyIn = subEvent.subEventType.tag === "FlyIn";
                    const isFlyOut = subEvent.subEventType.tag === "FlyOut";

                    return (
                      <Card
                        key={subEvent.subEventId.toString()}
                        className="p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`own-subevent-${subEvent.subEventId}`}
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleToggleOwnSubEvent(subEvent.subEventId)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <label
                                htmlFor={`own-subevent-${subEvent.subEventId}`}
                                className="font-medium cursor-pointer"
                              >
                                {subEvent.name}
                              </label>
                              {getSubEventTypeBadge(subEvent.subEventType)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {subEvent.description}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center">
                                <CalendarIcon2 className="h-3 w-3 mr-1" />
                                {formatDateInTimezone(
                                  subEvent.scheduledStartTime.toDate(),
                                  userTimezone
                                )}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTimeInTimezone(
                                  subEvent.scheduledStartTime.toDate(),
                                  userTimezone
                                )}
                              </span>

                              {isGroupFlight && (
                                <span>
                                  {subEvent.groupFlightDepartureIcao} →{" "}
                                  {subEvent.groupFlightArrivalIcao}
                                </span>
                              )}

                              {isFlyIn && subEvent.hubIcao && (
                                <span>Destination: {subEvent.hubIcao}</span>
                              )}

                              {isFlyOut && subEvent.hubIcao && (
                                <span>Departure: {subEvent.hubIcao}</span>
                              )}
                            </div>

                            {isSelected && (
                              <div className="mt-4 space-y-3 border-t pt-3">
                                <h4 className="text-sm font-medium">
                                  Flight Details
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`own-callsign-${subEvent.subEventId}`}
                                    >
                                      Callsign
                                    </Label>
                                    <Input
                                      id={`own-callsign-${subEvent.subEventId}`}
                                      value={
                                        ownFlightDetails[
                                          subEvent.subEventId.toString()
                                        ]?.callsign || ""
                                      }
                                      onChange={(e) =>
                                        updateOwnFlightDetail(
                                          subEvent.subEventId.toString(),
                                          "callsign",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. QFA123"
                                      disabled={isSubmittingFlights}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`own-aircraft-${subEvent.subEventId}`}
                                    >
                                      Aircraft Type
                                    </Label>
                                    <Input
                                      id={`own-aircraft-${subEvent.subEventId}`}
                                      value={
                                        ownFlightDetails[
                                          subEvent.subEventId.toString()
                                        ]?.aircraftType || ""
                                      }
                                      onChange={(e) =>
                                        updateOwnFlightDetail(
                                          subEvent.subEventId.toString(),
                                          "aircraftType",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. A320"
                                      disabled={isSubmittingFlights}
                                    />
                                  </div>
                                </div>

                                {/* Airport Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`own-departure-icao-${subEvent.subEventId}`}
                                    >
                                      {isGroupFlight
                                        ? "Departure Airport (Fixed)"
                                        : isFlyOut
                                          ? "Departure Airport (Hub)"
                                          : "Departure Airport"}
                                    </Label>
                                    <Input
                                      id={`own-departure-icao-${subEvent.subEventId}`}
                                      value={
                                        isGroupFlight
                                          ? subEvent.groupFlightDepartureIcao ||
                                            ""
                                          : isFlyOut
                                            ? subEvent.hubIcao || ""
                                            : ownFlightDetails[
                                                subEvent.subEventId.toString()
                                              ]?.customDepartureIcao || ""
                                      }
                                      onChange={(e) =>
                                        updateOwnFlightDetail(
                                          subEvent.subEventId.toString(),
                                          "customDepartureIcao",
                                          e.target.value
                                        )
                                      }
                                      placeholder={
                                        isGroupFlight || isFlyOut
                                          ? isGroupFlight
                                            ? subEvent.groupFlightDepartureIcao ||
                                              "Fixed departure"
                                            : subEvent.hubIcao ||
                                              "Fixed hub departure"
                                          : "Enter departure ICAO"
                                      }
                                      disabled={
                                        isSubmittingFlights ||
                                        isGroupFlight ||
                                        isFlyOut
                                      }
                                    />
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
                                    <Label
                                      htmlFor={`own-arrival-icao-${subEvent.subEventId}`}
                                    >
                                      {isGroupFlight
                                        ? "Arrival Airport (Fixed)"
                                        : isFlyIn
                                          ? "Arrival Airport (Hub)"
                                          : "Arrival Airport"}
                                    </Label>
                                    <Input
                                      id={`own-arrival-icao-${subEvent.subEventId}`}
                                      value={
                                        isGroupFlight
                                          ? subEvent.groupFlightArrivalIcao ||
                                            ""
                                          : isFlyIn
                                            ? subEvent.hubIcao || ""
                                            : ownFlightDetails[
                                                subEvent.subEventId.toString()
                                              ]?.customArrivalIcao || ""
                                      }
                                      onChange={(e) =>
                                        updateOwnFlightDetail(
                                          subEvent.subEventId.toString(),
                                          "customArrivalIcao",
                                          e.target.value
                                        )
                                      }
                                      placeholder={
                                        isGroupFlight || isFlyIn
                                          ? isGroupFlight
                                            ? subEvent.groupFlightArrivalIcao ||
                                              "Fixed arrival"
                                            : subEvent.hubIcao ||
                                              "Fixed hub arrival"
                                          : "Enter arrival ICAO"
                                      }
                                      disabled={
                                        isSubmittingFlights ||
                                        isGroupFlight ||
                                        isFlyIn
                                      }
                                    />
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
                                  <Label
                                    htmlFor={`own-route-${subEvent.subEventId}`}
                                  >
                                    {isGroupFlight
                                      ? "Route (Based on group flight)"
                                      : "Your Flight Route"}
                                  </Label>
                                  <Input
                                    id={`own-route-${subEvent.subEventId}`}
                                    value={
                                      ownFlightDetails[
                                        subEvent.subEventId.toString()
                                      ]?.route || ""
                                    }
                                    onChange={(e) =>
                                      updateOwnFlightDetail(
                                        subEvent.subEventId.toString(),
                                        "route",
                                        e.target.value
                                      )
                                    }
                                    placeholder={
                                      isGroupFlight
                                        ? subEvent.groupFlightRoute ||
                                          "Using planned group flight route"
                                        : "Enter your flight route"
                                    }
                                    disabled={isSubmittingFlights}
                                  />
                                  {isGroupFlight &&
                                    subEvent.groupFlightRoute && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Planned route:{" "}
                                        {subEvent.groupFlightRoute}
                                      </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`own-departure-${subEvent.subEventId}`}
                                    >
                                      Planned Departure Time
                                    </Label>
                                    <Input
                                      id={`own-departure-${subEvent.subEventId}`}
                                      type="datetime-local"
                                      value={
                                        ownFlightDetails[
                                          subEvent.subEventId.toString()
                                        ]?.departureTime || ""
                                      }
                                      onChange={(e) =>
                                        updateOwnFlightDetail(
                                          subEvent.subEventId.toString(),
                                          "departureTime",
                                          e.target.value
                                        )
                                      }
                                      disabled={isSubmittingFlights}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`own-arrival-${subEvent.subEventId}`}
                                    >
                                      Planned Arrival Time
                                    </Label>
                                    <Input
                                      id={`own-arrival-${subEvent.subEventId}`}
                                      type="datetime-local"
                                      value={
                                        ownFlightDetails[
                                          subEvent.subEventId.toString()
                                        ]?.arrivalTime || ""
                                      }
                                      onChange={(e) =>
                                        updateOwnFlightDetail(
                                          subEvent.subEventId.toString(),
                                          "arrivalTime",
                                          e.target.value
                                        )
                                      }
                                      disabled={isSubmittingFlights}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {selectedOwnSubEvents.length === 0 && (
                    <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                      <div className="text-amber-500">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <p className="text-sm">
                        Select at least one sub-event to participate in.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="flex gap-2 justify-between sm:justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowManageOwnFlightsDialog(false)}
                  disabled={isSubmittingFlights}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSubmitOwnFlights}
                  disabled={
                    selectedOwnSubEvents.length === 0 || isSubmittingFlights
                  }
                >
                  {isSubmittingFlights ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Save Flight Details"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {selectedOwnSubEvents.length > 0 ? (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 flex items-center gap-3">
              <div className="text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Your group has signed up for {selectedOwnSubEvents.length}{" "}
                  sub-event(s)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Edit Flight Details" to modify your participation.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Your group has not signed up for any sub-events yet. Click "Sign
              Up for Flights" to participate.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

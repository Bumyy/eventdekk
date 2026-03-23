import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventBannerField } from "./EventBannerField";
import { useCreateEventContext } from "./CreateEventContext";

export function CreateEventMainDetailsSection() {
  const {
    name,
    description,
    startDateTime,
    endDateTime,
    ifcEventLink,
    isInternal,
    setName,
    setDescription,
    setStartDateTime,
    setEndDateTime,
    setIfcEventLink,
    setIsInternal,
    previewUrl,
    bannerUrl,
    selectedFile,
    isUploading,
    isCreating,
    handleFileChange,
    setBannerUrl,
    clearBanner,
  } = useCreateEventContext();

  return (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimePicker
          label="Start Time"
          value={startDateTime}
          onChange={setStartDateTime}
          placeholder="Select start date and time"
        />

        <DateTimePicker
          label="End Time"
          value={endDateTime}
          onChange={setEndDateTime}
          placeholder="Select end date and time"
        />
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

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox
          id="isInternal"
          checked={isInternal}
          onCheckedChange={(checked) => setIsInternal(!!checked)}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="isInternal">Internal Event</Label>
          <p className="text-sm text-muted-foreground">
            Internal events are only visible to members of your group.
          </p>
        </div>
      </div>

      <EventBannerField
        previewUrl={previewUrl}
        bannerUrl={bannerUrl}
        selectedFile={selectedFile}
        isUploading={isUploading}
        isLoading={isCreating}
        onFileChange={handleFileChange}
        onBannerUrlChange={setBannerUrl}
        onClear={clearBanner}
      />
    </div>
  );
}

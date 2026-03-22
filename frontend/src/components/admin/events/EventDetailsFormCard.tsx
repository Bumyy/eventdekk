import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { formatDateTimeInTimezone } from "@/utils/timezoneUtils";
import { EventBannerField } from "./EventBannerField";

interface EventDetailsFormCardProps {
  name: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
  ifcEventLink: string;
  isInternal: boolean;
  previewUrl: string | null;
  bannerUrl: string;
  selectedFile: File | null;
  isUploading: boolean;
  isLoading: boolean;
  userTimezone: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartTimeChange: (value: Date | null) => void;
  onEndTimeChange: (value: Date | null) => void;
  onIfcEventLinkChange: (value: string) => void;
  onIsInternalChange: (value: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerUrlChange: (value: string) => void;
  onClearBanner: () => void;
}

export function EventDetailsFormCard({
  name,
  description,
  startTime,
  endTime,
  ifcEventLink,
  isInternal,
  previewUrl,
  bannerUrl,
  selectedFile,
  isUploading,
  isLoading,
  userTimezone,
  onNameChange,
  onDescriptionChange,
  onStartTimeChange,
  onEndTimeChange,
  onIfcEventLinkChange,
  onIsInternalChange,
  onFileChange,
  onBannerUrlChange,
  onClearBanner,
}: EventDetailsFormCardProps) {
  return (
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
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter event name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Enter event description"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimePicker
            label="Start Time"
            value={startTime}
            onChange={(date) => onStartTimeChange(date || null)}
            placeholder={
              startTime
                ? formatDateTimeInTimezone(startTime, userTimezone)
                : "Select date and time"
            }
            timezone={userTimezone}
          />

          <DateTimePicker
            label="End Time"
            value={endTime}
            onChange={(date) => onEndTimeChange(date || null)}
            placeholder={
              endTime
                ? formatDateTimeInTimezone(endTime, userTimezone)
                : "Select date and time"
            }
            timezone={userTimezone}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ifcEventLink">IFC Event Link (Optional)</Label>
          <Input
            id="ifcEventLink"
            value={ifcEventLink}
            onChange={(e) => onIfcEventLinkChange(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <Checkbox
            id="isInternal"
            checked={isInternal}
            onCheckedChange={(checked) => onIsInternalChange(!!checked)}
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
          isLoading={isLoading}
          onFileChange={onFileChange}
          onBannerUrlChange={onBannerUrlChange}
          onClear={onClearBanner}
        />
      </CardContent>
    </Card>
  );
}

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
import { Textarea } from "@/components/ui/textarea";
import { EventBannerField } from "./EventBannerField";
import { useEditEventContext } from "./EditEventContext";

export function EventDetailsFormCard() {
  const {
    name,
    description,
    ifcEventLink,
    isInternal,
    setName,
    setDescription,
    setIfcEventLink,
    setIsInternal,
  } = useEditEventContext();

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

        <div className="space-y-2">
          <Label htmlFor="ifcEventLink">IFC Event Link (Optional)</Label>
          <Input
            id="ifcEventLink"
            value={ifcEventLink}
            onChange={(e) => setIfcEventLink(e.target.value)}
            placeholder="https://..."
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

        <EventBannerField />
      </CardContent>
    </Card>
  );
}

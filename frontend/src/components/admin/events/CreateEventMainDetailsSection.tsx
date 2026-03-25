import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventBannerField } from "./EventBannerField";
import { useCreateEventContext } from "./CreateEventContext";

export function CreateEventMainDetailsSection() {
  const {
    name,
    description,
    ifcEventLink,
    isInternal,
    setName,
    setDescription,
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

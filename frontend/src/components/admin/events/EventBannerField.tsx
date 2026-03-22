import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { useEditEventContext } from "./EditEventContext";

export function EventBannerField() {
  const {
    previewUrl,
    bannerUrl,
    selectedFile,
    isUploading,
    isLoading,
    handleFileChange,
    setBannerUrl,
    clearBanner,
  } = useEditEventContext();

  return (
    <div className="space-y-2">
      <Label>Banner Image</Label>

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
              onClick={clearBanner}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="space-y-2 flex-1">
          <Label htmlFor="bannerImageFile" className="text-sm font-medium mb-2 block">
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
  );
}

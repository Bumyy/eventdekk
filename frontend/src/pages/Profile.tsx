import { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/spacetimeHooks";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Globe, User } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/api/apiService";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpacetimeDB } from "spacetimedb/react";
import {
  TIMEZONE_GROUPS,
  detectUserTimezone,
  formatTimezoneName,
} from "../utils/timezoneUtils";

const Profile = () => {
  const { getConnection, identity } = useSpacetimeDB();
  const connection = getConnection();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { linkedAccounts, linkGoogle, linkDiscord } = useAuth();

  const currentUser = useCurrentUser();
  const detectedTz = detectUserTimezone();

  const [formData, setFormData] = useState({
    displayName: "",
    ifcProfileUrl: "",
    ifcCallsignPrefix: "",
    timezone: "",
  });

  // Track if we've populated form data from currentUser
  const hasPopulatedFromUser = useRef(false);
  // Track if we've synced OAuth data into form
  const hasSyncedOAuthData = useRef(false);

  // Effect to populate form data when currentUser is loaded (only once when identity is stable)
  useEffect(() => {
    // Only populate once we have a stable identity and user data
    if (currentUser && identity && !hasPopulatedFromUser.current) {
      setFormData({
        displayName: currentUser.displayName || "",
        ifcProfileUrl: currentUser.ifcProfileUrl || "",
        ifcCallsignPrefix: currentUser.ifcCallsignPrefix || "",
        // Do NOT autofill detectedTz. Strictly rely on what the DB returns.
        timezone: currentUser.timezone || "",
      });
      setPreviewUrl(null);
      setSelectedFile(null);
      hasPopulatedFromUser.current = true;
    }
  }, [currentUser?.identity, identity, currentUser]);

  // Update form when OAuth sync populates user data (displayName/photo) for the first time
  useEffect(() => {
    if (
      currentUser &&
      hasPopulatedFromUser.current &&
      !hasSyncedOAuthData.current &&
      currentUser.displayName
    ) {
      hasSyncedOAuthData.current = true;
      setFormData((prev) => ({
        ...prev,
        displayName: currentUser.displayName || "",
        ifcProfileUrl: currentUser.ifcProfileUrl || "",
      }));
    }
  }, [currentUser]);

  // Effect to create/revoke preview URL
  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }

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
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
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

  // Handle form submission (including upload if needed)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection || !currentUser) {
      toast.error("Connection or user data missing.");
      return;
    }

    setIsSaving(true);
    let uploadedImageUrl = formData.ifcProfileUrl;

    if (selectedFile) {
      try {
        uploadedImageUrl = await uploadImage(
          selectedFile,
          formData.displayName || "Profile Picture"
        );
        toast.success("Profile picture updated!");
      } catch (error: any) {
        console.error("Image upload failed:", error);
        toast.error(`Image upload failed: ${error.message || "Network error"}`);
        setIsSaving(false);
        return;
      }
    }

    try {
      connection.reducers.setUserProfile({
        displayName: formData.displayName,
        ifcProfileUrl: uploadedImageUrl,
        ifcCallsignPrefix: formData.ifcCallsignPrefix,
        timezone: formData.timezone,
      });

      setFormData((prev) => ({
        ...prev,
        ifcProfileUrl: uploadedImageUrl,
      }));
      setSelectedFile(null);

      if (!selectedFile) {
        toast.success("Profile details saved.");
      }
    } catch (error) {
      console.error("Failed to update SpacetimeDB profile:", error);
      toast.error("Failed to save profile details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!connection || !identity) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Connecting...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 px-4">
      <Card className="py-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
          <CardDescription>
            Update your display name, profile picture, callsign, and timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-y-0 sm:space-x-6">
              <Avatar className="h-24 w-24 text-4xl">
                <AvatarImage
                  src={previewUrl || formData.ifcProfileUrl || undefined}
                  alt="Profile Picture"
                />
                <AvatarFallback>
                  {formData.displayName ? (
                    formData.displayName.slice(0, 2).toUpperCase()
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full sm:w-auto">
                <Label
                  htmlFor="profilePictureFile"
                  className="text-sm font-medium mb-2 block"
                >
                  Change Profile Picture
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="profilePictureFile"
                    type="file"
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    onChange={handleFileChange}
                    className="flex-1 file:mr-4 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    disabled={isSaving}
                  />
                  {!isSaving && (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB. JPG, PNG, WEBP, GIF accepted.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                // ALWAYS use functional state updates (prev => ...) to prevent race condition bugs
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                placeholder="Your display name"
                maxLength={50}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifcCallsignPrefix">IFC Callsign Prefix</Label>
              <Input
                id="ifcCallsignPrefix"
                value={formData.ifcCallsignPrefix}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ifcCallsignPrefix: e.target.value.toUpperCase(),
                  }))
                }
                maxLength={10}
                placeholder="E.g., QVA"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>

              <Select
                value={formData.timezone}
                onValueChange={(value) => {
                  if (!value || value.trim() === "") return;

                  setFormData((prev) => ({ ...prev, timezone: value }));
                }}
                disabled={isSaving}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Object.entries(TIMEZONE_GROUPS).map(
                    ([region, timezones]) => (
                      <SelectGroup key={region}>
                        <SelectLabel>{region}</SelectLabel>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {formatTimezoneName(tz)}
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date().toLocaleTimeString(undefined, {
                                timeZone: tz,
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  )}
                </SelectContent>
              </Select>

              {/* Smart notification for timezone suggestions */}
              {!formData.timezone && detectedTz ? (
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border mt-2">
                  <p className="text-sm text-muted-foreground">
                    You haven't set a timezone. We detected{" "}
                    <span className="font-semibold text-foreground">
                      {formatTimezoneName(detectedTz)}
                    </span>
                    .
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 ml-2"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, timezone: detectedTz }))
                    }
                  >
                    Use Detected
                  </Button>
                </div>
              ) : formData.timezone &&
                formData.timezone !== detectedTz &&
                detectedTz ? (
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border mt-2">
                  <p className="text-sm text-muted-foreground">
                    We detected your local time as{" "}
                    <span className="font-semibold text-foreground">
                      {formatTimezoneName(detectedTz)}
                    </span>
                    .
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 ml-2"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, timezone: detectedTz }))
                    }
                  >
                    Update to Detected
                  </Button>
                </div>
              ) : formData.timezone === detectedTz ? (
                <p className="text-xs text-muted-foreground pt-1">
                  Your timezone matches your automatically detected local time.
                </p>
              ) : null}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Linked Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Link your Google or Discord account to sign in with either
                provider.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={
                    linkedAccounts.some((a) => a.type === "google")
                      ? "outline"
                      : "default"
                  }
                  size="sm"
                  disabled={linkedAccounts.some((a) => a.type === "google")}
                  onClick={linkGoogle}
                >
                  {linkedAccounts.some((a) => a.type === "google")
                    ? "Google Linked"
                    : "Link Google"}
                </Button>
                <Button
                  type="button"
                  variant={
                    linkedAccounts.some((a) => a.type === "discord")
                      ? "outline"
                      : "default"
                  }
                  size="sm"
                  disabled={linkedAccounts.some((a) => a.type === "discord")}
                  onClick={linkDiscord}
                >
                  {linkedAccounts.some((a) => a.type === "discord")
                    ? "Discord Linked"
                    : "Link Discord"}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} size="lg">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

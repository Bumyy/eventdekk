import { useState, useEffect, useCallback } from "react";
import { useUsers } from "@/hooks/spacetimeHooks";
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
import { Loader2, Upload, Globe } from "lucide-react";
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

// More comprehensive timezone list organized by region
const TIMEZONE_GROUPS = {
  "UTC/GMT": ["UTC"],
  Africa: [
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
  ],
  Americas: [
    "America/Anchorage",
    "America/Bogota",
    "America/Buenos_Aires",
    "America/Caracas",
    "America/Chicago",
    "America/Denver",
    "America/Halifax",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/New_York",
    "America/Phoenix",
    "America/Santiago",
    "America/Sao_Paulo",
    "America/St_Johns",
    "America/Toronto",
    "America/Vancouver",
  ],
  Asia: [
    "Asia/Baghdad",
    "Asia/Bangkok",
    "Asia/Dhaka",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Istanbul",
    "Asia/Jakarta",
    "Asia/Jerusalem",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Kuala_Lumpur",
    "Asia/Manila",
    "Asia/Riyadh",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Taipei",
    "Asia/Tehran",
    "Asia/Tokyo",
  ],
  Europe: [
    "Europe/Amsterdam",
    "Europe/Athens",
    "Europe/Belgrade",
    "Europe/Berlin",
    "Europe/Brussels",
    "Europe/Budapest",
    "Europe/Copenhagen",
    "Europe/Dublin",
    "Europe/Helsinki",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Moscow",
    "Europe/Oslo",
    "Europe/Paris",
    "Europe/Prague",
    "Europe/Rome",
    "Europe/Stockholm",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Zurich",
  ],
  Oceania: [
    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Darwin",
    "Australia/Melbourne",
    "Australia/Perth",
    "Australia/Sydney",
    "Pacific/Auckland",
    "Pacific/Fiji",
    "Pacific/Honolulu",
  ],
};

// Flatten the timezone groups for searching
const ALL_TIMEZONES = Object.values(TIMEZONE_GROUPS).flat();

const Profile = () => {
  const { getConnection, identity } = useSpacetimeDB();
  const connection = getConnection();
  const users = useUsers();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    ifcProfileUrl: "",
    ifcCallsignPrefix: "",
    timezone: "",
  });

  // Function to detect user's timezone
  const detectUserTimezone = useCallback(() => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return ALL_TIMEZONES.includes(userTimezone) ? userTimezone : "UTC";
    } catch (error) {
      console.error("Error detecting timezone:", error);
      return "UTC";
    }
  }, []);

  // Format timezone name for display
  const formatTimezone = useCallback((tz: string) => {
    const parts = tz.split("/");
    if (parts.length === 1) return tz;
    return parts[parts.length - 1].replace(/_/g, " ");
  }, []);

  // Find the current user based on identity
  const currentUser = users?.find(
    (u) => u.identity.toHexString() === identity?.toHexString()
  );

  // Effect to populate form data when currentUser is loaded
  useEffect(() => {
    if (currentUser) {
      setFormData({
        displayName: currentUser.displayName || "",
        ifcProfileUrl: currentUser.ifcProfileUrl || "",
        ifcCallsignPrefix: currentUser.ifcCallsignPrefix || "",
        timezone: currentUser.timezone || detectUserTimezone(),
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [currentUser, detectUserTimezone]);

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
        timezone: formData.timezone || detectUserTimezone(),
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
                    <UserIcon className="h-10 w-10" />
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
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
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
                  setFormData({
                    ...formData,
                    ifcCallsignPrefix: e.target.value.toUpperCase(),
                  })
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
                value={formData.timezone || detectUserTimezone()}
                onValueChange={(value) =>
                  setFormData({ ...formData, timezone: value })
                }
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
                            {formatTimezone(tz)}
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
              <p className="text-xs text-muted-foreground">
                Your local timezone was automatically detected as{" "}
                <span className="font-medium">
                  {formatTimezone(detectUserTimezone())}
                </span>
                .
              </p>
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

// Simple User Icon for Fallback
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    {...props}
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

export default Profile;

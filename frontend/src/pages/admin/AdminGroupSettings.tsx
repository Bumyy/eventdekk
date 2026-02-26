import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroups } from "@/hooks/spacetimeHooks";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Link, Info, Palette } from "lucide-react";
import { uploadImage } from "@/api/apiService";
import { useSpacetimeDB } from "spacetimedb/react";

export default function AdminGroupSettings() {
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;
  const navigate = useNavigate();
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const groups = useGroups();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [color, setColor] = useState("#000000"); // Default color is black

  // Get current group data
  useEffect(() => {
    if (!groups || !groupIdBigInt) return;

    const group = groups.find((g) => g.groupId === groupIdBigInt);
    console.log(group);
    if (group) {
      setName(group.name);
      setTag(group.tag || "");
      setDescription(group.description || "");
      setWebsiteUrl(group.websiteUrl || "");
      setLogoUrl(group.logoUrl || "");
      setLogoPreview(group.logoUrl || null);
      setColor(group.color || "#000000"); // Set color from group data or default
    }
  }, [groups, groupIdBigInt, navigate]);

  // Handle logo file selection
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview the selected image
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    setLogoFile(file);
    setLogoUrl(""); // Clear the URL input when file is selected
  };

  // Handle logo URL input
  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLogoUrl(url);
    setLogoPreview(url);
    setLogoFile(null); // Clear the file when URL is entered
  };

  // Upload logo file using the API service
  const uploadLogo = async (file: File): Promise<string> => {
    setIsLoading(true);
    try {
      // Use the uploadImage function from apiService
      const imageUrl = await uploadImage(file, `group-logo-${groupId}`);
      return imageUrl;
    } catch (error) {
      console.error("Logo upload failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection || !groupIdBigInt) return;

    try {
      setIsSaving(true);

      // Show a loading toast
      const toastId = toast.loading("Saving group settings...");

      // If a file was selected, upload it first
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        try {
          toast.loading("Uploading logo...", { id: toastId });
          finalLogoUrl = await uploadLogo(logoFile);
        } catch (error) {
          toast.error("Logo upload failed", {
            id: toastId,
            description:
              error instanceof Error
                ? error.message
                : "An unknown error occurred",
          });
          setIsSaving(false);
          return;
        }
      }

      // Update the toast message
      toast.loading("Updating group settings...", { id: toastId });

      // Create a promise wrapper for the callback
      await new Promise<void>((resolve, reject) => {
        const callback = (ctx: any) => {
          // Clean up the callback after we get a response
          connection.reducers.removeOnUpdateGroup(callback);

          if (ctx.event.status.tag === "Failed") {
            reject(
              new Error(`Failed to update group: ${ctx.event.status.value}`)
            );
          } else {
            resolve();
          }
        };

        connection.reducers.onUpdateGroup(callback);

        // Call the reducer
        connection.reducers.updateGroup({
          groupId: groupIdBigInt,
          name: name,
          tag: tag,
          description: description,
          websiteUrl: websiteUrl,
          logoUrl: finalLogoUrl,
          color: color,
        });
      });

      // Update success toast
      toast.success("Group settings updated successfully", { id: toastId });
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update group settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Group Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      placeholder="Group Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tag">Group Tag</Label>
                    <Input
                      id="tag"
                      placeholder="TAG"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 4 characters
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your group..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      type="url"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
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
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24 rounded-md">
                    <AvatarImage
                      src={logoPreview || undefined}
                      alt="Group logo"
                    />
                    <AvatarFallback className="rounded-md text-lg">
                      {tag || name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-medium">Group Logo</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a square image for your group's logo.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-url">Logo URL</Label>
                    <Input
                      id="logo-url"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={handleLogoUrlChange}
                      type="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a direct URL to your logo image
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo-file">Or upload a file</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="logo-file"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      <div className="grid w-full gap-1.5">
                        <Label
                          htmlFor="logo-file"
                          className="flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground ring-offset-background hover:bg-accent hover:text-accent-foreground"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {logoFile ? logoFile.name : "Choose file"}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="brand-color">Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2 w-full">
                      <Input
                        id="brand-color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-12 h-8 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                        pattern="^#([A-Fa-f0-9]{6})$"
                        title="Please enter a valid hex color code (e.g. #FF0000)"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select a brand color for your group (hex format: #RRGGBB)
                  </p>
                  <div
                    className="mt-2 h-8 w-full rounded-md border"
                    style={{ backgroundColor: color }}
                    aria-label="Color preview"
                  />
                </div>

                <div className="rounded-md bg-muted p-4 text-sm flex gap-2">
                  <Info className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium">
                      Recommended logo specifications:
                    </p>
                    <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                      <li>Square aspect ratio (1:1)</li>
                      <li>Minimum size: 256x256 pixels</li>
                      <li>Maximum file size: 2MB</li>
                      <li>Formats: PNG, JPG, SVG</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || isLoading}>
                  {isSaving || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLoading ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

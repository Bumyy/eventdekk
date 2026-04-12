import { useNavigate } from "react-router-dom";
import { useGroupSettingsForm } from "@/hooks/useGroupSettingsForm";
import { useIsSuperAdmin } from "@/hooks/spacetimeHooks";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Info,
  Link,
  Loader2,
  Palette,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

type GroupSettingsEditorProps = {
  groupId: bigint | null;
  title: string;
  backTo?: string;
  canEditIdentityFields?: boolean;
  showDiscordWebhookSettings?: boolean;
};

export function GroupSettingsEditor({
  groupId,
  title,
  backTo,
  canEditIdentityFields = true,
  showDiscordWebhookSettings = false,
}: GroupSettingsEditorProps) {
  const navigate = useNavigate();
  const isSuperAdmin = useIsSuperAdmin();
  const {
    isUploading,
    isSaving,
    name,
    setName,
    tag,
    setTag,
    description,
    setDescription,
    websiteUrl,
    setWebsiteUrl,
    logoUrl,
    logoFile,
    logoPreview,
    color,
    setColor,
    callsignFilters,
    newCallsignFilter,
    setNewCallsignFilter,
    isManagingCallsignFilter,
    addCallsignFilter,
    removeCallsignFilter,
    discordWebhookUrl,
    setDiscordWebhookUrl,
    discordWebhookEnabled,
    setDiscordWebhookEnabled,
    isSavingDiscordWebhook,
    canManageDiscordWebhook,
    saveDiscordWebhookSettings,
    handleLogoFileChange,
    handleLogoUrlChange,
    handleSubmit,
  } = useGroupSettingsForm({ groupId });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        {backTo && (
          <Button variant="outline" onClick={() => navigate(backTo)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="callsign">Callsign Matching</TabsTrigger>
          {showDiscordWebhookSettings && (
            <TabsTrigger value="discord">Discord</TabsTrigger>
          )}
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
                      disabled={!canEditIdentityFields}
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
                      disabled={!canEditIdentityFields}
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {canEditIdentityFields
                        ? "Maximum 4 characters"
                        : "Only super admins can edit group name and tag"}
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
                      Upload a square image for your group logo.
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
                <Button type="submit" disabled={isSaving || isUploading}>
                  {isSaving || isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="callsign" className="space-y-4">
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Callsign Formats</h3>
              <p className="text-sm text-muted-foreground">
                Add one format per line, like <code>Qatari VA</code> or{" "}
                <code>QR</code>. A live callsign matches when it contains all
                words from one format.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newCallsignFilter}
                onChange={(e) => setNewCallsignFilter(e.target.value)}
                placeholder="Example: Qatari VA"
              />
              <Button
                type="button"
                onClick={addCallsignFilter}
                disabled={isManagingCallsignFilter || !newCallsignFilter.trim()}
              >
                {isManagingCallsignFilter ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {callsignFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No callsign formats configured yet.
                </p>
              ) : (
                callsignFilters.map((filter) => (
                  <div
                    key={filter.filterId.toString()}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <span className="font-mono text-sm">{filter.words}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCallsignFilter(filter.filterId)}
                      disabled={isManagingCallsignFilter}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {showDiscordWebhookSettings && (
          <TabsContent value="discord" className="space-y-4">
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Discord Updates Webhook
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure where invite and invitation response updates will be
                  posted.
                </p>
              </div>

              <div className="rounded-md border border-muted p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label
                      htmlFor="discord-enabled"
                      className="text-sm font-medium"
                    >
                      Enable webhook notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Turn off to keep the URL saved but pause all Discord
                      messages. Changing the webhook URL automatically
                      re-enables notifications.
                    </p>
                  </div>
                  <Checkbox
                    id="discord-enabled"
                    checked={discordWebhookEnabled}
                    onCheckedChange={(checked) =>
                      setDiscordWebhookEnabled(checked === true)
                    }
                    disabled={!canManageDiscordWebhook}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discord-webhook-url">Webhook URL</Label>
                  <Input
                    id="discord-webhook-url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    disabled={!canManageDiscordWebhook}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only group CEOs and super admins can view or change this
                    value.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  onClick={saveDiscordWebhookSettings}
                  disabled={isSavingDiscordWebhook || !canManageDiscordWebhook}
                >
                  {isSavingDiscordWebhook ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Webhook
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

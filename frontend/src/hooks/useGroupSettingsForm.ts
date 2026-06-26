import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSpacetimeDB } from "spacetimedb/react";
import { uploadImage } from "@/api/apiService";
import {
  useGroupCallsignFilters,
  useGroups,
  useGroupMemberships,
  useIsSuperAdmin,
  useMyGroupDiscordWebhooks,
} from "@/hooks/spacetimeHooks";

type UseGroupSettingsFormArgs = {
  groupId: bigint | null;
};

export function useGroupSettingsForm({ groupId }: UseGroupSettingsFormArgs) {
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const groups = useGroups();
  const memberships = useGroupMemberships();
  const isSuperAdmin = useIsSuperAdmin();
  const callsignFilters = useGroupCallsignFilters(groupId);
  const myGroupDiscordWebhooks = useMyGroupDiscordWebhooks();

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [color, setColor] = useState("#000000");
  const [newCallsignFilter, setNewCallsignFilter] = useState("");
  const [newFilterColor, setNewFilterColor] = useState("");
  const [newFilterLabel, setNewFilterLabel] = useState("");
  const [isManagingCallsignFilter, setIsManagingCallsignFilter] =
    useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [discordWebhookEnabled, setDiscordWebhookEnabled] = useState(false);
  const [isSavingDiscordWebhook, setIsSavingDiscordWebhook] = useState(false);
  const [canManageDiscordWebhook, setCanManageDiscordWebhook] = useState(false);

  useEffect(() => {
    if (!groups || !groupId) return;

    const group = groups.find((g) => g.groupId === groupId);
    if (!group) return;

    setName(group.name);
    setTag(group.tag || "");
    setDescription(group.description || "");
    setWebsiteUrl(group.websiteUrl || "");
    setLogoUrl(group.logoUrl || "");
    setLogoPreview(group.logoUrl || null);
    setColor(group.color || "#000000");
  }, [groups, groupId]);

  useEffect(() => {
    if (!groupId || !connection) {
      setCanManageDiscordWebhook(false);
      return;
    }

    const identityHex = connection.identity?.toHexString();
    if (!identityHex) {
      setCanManageDiscordWebhook(false);
      return;
    }

    const group = groups.find((g) => g.groupId === groupId);
    const isGroupOwnerCeo = group?.ceoIdentity.toHexString() === identityHex;
    const hasCeoMembership = memberships.some(
      (m) =>
        m.groupId === groupId &&
        m.userIdentity.toHexString() === identityHex &&
        m.permissionLevel.tag === "Ceo"
    );

    setCanManageDiscordWebhook(
      Boolean(isSuperAdmin || isGroupOwnerCeo || hasCeoMembership)
    );
  }, [groupId, groups, memberships, connection, isSuperAdmin]);

  useEffect(() => {
    if (!groupId || !canManageDiscordWebhook) {
      setDiscordWebhookUrl("");
      setDiscordWebhookEnabled(false);
      return;
    }

    const row = myGroupDiscordWebhooks.find((w) => w.groupId === groupId);
    setDiscordWebhookUrl(row?.webhookUrl ?? "");
    setDiscordWebhookEnabled(row?.enabled ?? false);
  }, [groupId, myGroupDiscordWebhooks, canManageDiscordWebhook]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setLogoFile(file);
    setLogoUrl("");
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextLogoUrl = e.target.value;
    setLogoUrl(nextLogoUrl);
    setLogoPreview(nextLogoUrl);
    setLogoFile(null);
  };

  const uploadLogo = async (file: File): Promise<string> => {
    if (!groupId) {
      throw new Error("Invalid group id");
    }
    setIsUploading(true);
    try {
      return await uploadImage(file, `group-logo-${groupId.toString()}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection || !groupId) return;

    try {
      setIsSaving(true);
      const toastId = toast.loading("Saving group settings...");

      let finalLogoUrl = logoUrl;
      if (logoFile) {
        toast.loading("Uploading logo...", { id: toastId });
        finalLogoUrl = await uploadLogo(logoFile);
      }

      toast.loading("Updating group settings...", { id: toastId });

      await connection.reducers.updateGroup({
        groupId,
        name,
        tag,
        description,
        websiteUrl: websiteUrl || undefined,
        logoUrl: finalLogoUrl || undefined,
        color: color || undefined,
      });

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

  const addCallsignFilter = async () => {
    if (!connection || !groupId) return;

    const words = newCallsignFilter.trim();
    if (!words) {
      toast.error("Enter callsign words first");
      return;
    }

    try {
      setIsManagingCallsignFilter(true);
      await connection.reducers.addGroupCallsignFilter({
        groupId,
        words,
        color: newFilterColor || undefined,
        label: newFilterLabel || undefined,
      });
      setNewCallsignFilter("");
      setNewFilterColor("");
      setNewFilterLabel("");
      toast.success("Callsign format added");
    } catch (error) {
      console.error("Error adding callsign format:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add callsign format"
      );
    } finally {
      setIsManagingCallsignFilter(false);
    }
  };

  const removeCallsignFilter = async (filterId: bigint) => {
    if (!connection) return;

    try {
      setIsManagingCallsignFilter(true);
      await connection.reducers.removeGroupCallsignFilter({ filterId });
      toast.success("Callsign format removed");
    } catch (error) {
      console.error("Error removing callsign format:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove callsign format"
      );
    } finally {
      setIsManagingCallsignFilter(false);
    }
  };

  const saveDiscordWebhookSettings = async () => {
    if (!groupId || !connection) return;

    if (!canManageDiscordWebhook) {
      toast.error(
        "Only CEOs and super admins can manage Discord webhook settings"
      );
      return;
    }

    const trimmedWebhookUrl = discordWebhookUrl.trim();
    if (!trimmedWebhookUrl) {
      toast.error("Webhook URL is required");
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmedWebhookUrl);
    } catch {
      toast.error("Please enter a valid webhook URL");
      return;
    }

    if (
      !parsed.hostname.endsWith("discord.com") ||
      !parsed.pathname.startsWith("/api/webhooks/")
    ) {
      toast.error("Webhook URL must be a valid Discord webhook endpoint");
      return;
    }

    setIsSavingDiscordWebhook(true);
    const toastId = toast.loading("Saving Discord webhook settings...");
    try {
      const setGroupDiscordWebhook = (
        connection.reducers as Record<
          string,
          (args: {
            groupId: bigint;
            webhookUrl: string;
            enabled: boolean;
          }) => Promise<void>
        >
      ).setGroupDiscordWebhook;

      if (typeof setGroupDiscordWebhook !== "function") {
        throw new Error(
          "set_group_discord_webhook reducer is not available yet. Refresh after syncing module bindings."
        );
      }

      await setGroupDiscordWebhook({
        groupId,
        webhookUrl: trimmedWebhookUrl,
        enabled: discordWebhookEnabled,
      });

      toast.success("Discord webhook settings saved", { id: toastId });
    } catch (error) {
      console.error("Error saving Discord webhook settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save Discord webhook settings",
        { id: toastId }
      );
    } finally {
      setIsSavingDiscordWebhook(false);
    }
  };

  return {
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
    newFilterColor,
    setNewFilterColor,
    newFilterLabel,
    setNewFilterLabel,
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
  };
}

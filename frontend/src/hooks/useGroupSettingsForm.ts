import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSpacetimeDB } from "spacetimedb/react";
import { uploadImage } from "@/api/apiService";
import { useGroups } from "@/hooks/spacetimeHooks";

type UseGroupSettingsFormArgs = {
  groupId: bigint | null;
};

export function useGroupSettingsForm({ groupId }: UseGroupSettingsFormArgs) {
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const groups = useGroups();

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
        error instanceof Error ? error.message : "Failed to update group settings"
      );
    } finally {
      setIsSaving(false);
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
    handleLogoFileChange,
    handleLogoUrlChange,
    handleSubmit,
  };
}

import { useParams } from "react-router-dom";
import { GroupSettingsEditor } from "@/components/admin/groups/GroupSettingsEditor";

export default function AdminGroupSettings() {
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;

  return (
    <GroupSettingsEditor
      groupId={groupIdBigInt}
      title="Group Settings"
      backTo={groupId ? `/admin/dashboard/${groupId}` : "/admin"}
      canEditIdentityFields={false}
      showDiscordWebhookSettings
    />
  );
}

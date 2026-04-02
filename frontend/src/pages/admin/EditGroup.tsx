import { useParams } from "react-router-dom";
import { GroupSettingsEditor } from "@/components/admin/groups/GroupSettingsEditor";

export default function EditGroup() {
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;

  return (
    <GroupSettingsEditor
      groupId={groupIdBigInt}
      title="Edit Group"
      backTo="/admin/site"
    />
  );
}

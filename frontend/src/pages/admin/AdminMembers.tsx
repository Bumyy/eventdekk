import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGroupMembersForGroup, useUsers, useGroupById } from "@/hooks/spacetimeHooks";
import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionLevel } from "@/module_bindings";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Infer, Identity } from "spacetimedb";
import { useSpacetimeDB } from "spacetimedb/react";

type PermissionLevel = Infer<typeof PermissionLevel>;

export default function AdminMembers() {
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const currentGroup = useGroupById(groupIdBigInt);
  const memberships = useGroupMembersForGroup(groupIdBigInt);
  const users = useUsers();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMemberPermission, setNewMemberPermission] =
    useState<PermissionLevel>({
      tag: "Member",
    });

  const regularMembers = memberships
    ?.filter((m) => {
      if (!currentGroup) return true;
      return m.membership.userIdentity.toHexString() !==currentGroup.ceoIdentity.toHexString();
    })
    .map((m) => ({
      membershipId: m.membership.membershipId,
      groupId: m.membership.groupId,
      userIdentity: m.membership.userIdentity,
      permissionLevel: m.membership.permissionLevel,
      user: m.user,
      isCeo: false,
    })) || [];

  const ceoMember = currentGroup
    ? {
        membershipId: BigInt(0),
        groupId: currentGroup.groupId,
        userIdentity: currentGroup.ceoIdentity,
        permissionLevel: { tag: "CEO" as const },
        user: users?.find(
          (u) =>
            u.identity.toHexString() === currentGroup.ceoIdentity.toHexString()
        ),
        isCeo: true,
      }
    : null;

  const groupMembers = ceoMember ? [ceoMember, ...regularMembers] : regularMembers;

  const memberIdentities = new Set(
    groupMembers.map((member) => member.userIdentity.toHexString())
  );

  const availableUsers = users?.filter(
    (user) => !memberIdentities.has(user.identity.toHexString())
  );

  const filteredUsers = availableUsers?.filter((user) =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async () => {
    if (!connection || !groupIdBigInt || !selectedUserId) return;

    try {
      connection.reducers.addGroupMember({
        groupId: groupIdBigInt,
        userIdentity: Identity.fromString(selectedUserId),
        permissionLevel: newMemberPermission,
      });
      setShowAddDialog(false);
      setSelectedUserId("");
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const handleRemoveMember = async (userIdentity: string, isCeo: boolean) => {
    if (!connection || !groupIdBigInt || isCeo) return;

    try {
      connection.reducers.removeGroupMember({
        groupId: groupIdBigInt,
        userIdentity: Identity.fromString(userIdentity),
      });
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Group Members</h1>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Members</h2>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Select User</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="flex items-center px-2 pb-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      {filteredUsers?.map((user) => (
                        <SelectItem
                          key={user.identity.toHexString()}
                          value={user.identity.toHexString()}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.ifcProfileUrl} />
                              <AvatarFallback>
                                {user.displayName
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("") || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.displayName || "Unknown User"}</span>
                            {user.online && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permission">Permission Level</Label>
                  <Select
                    value={newMemberPermission.tag}
                    onValueChange={(value) =>
                      setNewMemberPermission({
                        tag: value as "CEO" | "Staff" | "Member",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select permission level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddMember}
                  className="w-full"
                  disabled={!selectedUserId}
                >
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-4">
          {groupMembers?.map((member) => (
            <div
              key={member.membershipId.toString()}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={member.user?.ifcProfileUrl} />
                    <AvatarFallback>
                      {member.user?.displayName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {member.user?.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      {member.user?.displayName || "Unknown User"}
                    </h3>
                    <Badge
                      variant={
                        member.permissionLevel.tag === "CEO"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {member.permissionLevel.tag}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {member.user?.identity.toHexString()}
                  </p>
                </div>
              </div>
              {!member.isCeo && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleRemoveMember(
                      member.userIdentity.toHexString(),
                      member.isCeo
                    )
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

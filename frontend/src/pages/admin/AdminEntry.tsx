import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CalendarSearch } from "lucide-react";
import { useGroups, useGroupMemberships } from "@/hooks/spacetimeHooks";
import { Badge } from "@/components/ui/badge";
import { useSpacetimeDB } from "spacetimedb/react";

function getRoleLabel(role: { tag: "CEO" | "Staff" | "Member" }, isCeo: boolean) {
  if (isCeo) return "CEO";
  if (role.tag === "CEO") return "Admin";
  return role.tag;
}

export default function AdminEntry() {
  const navigate = useNavigate();
  const { identity } = useSpacetimeDB();
  const groups = useGroups();
  const memberships = useGroupMemberships();

  // Filter and map groups to include role information
  const userGroups = groups
    .filter((group) => {
      // Check if user is CEO or a member
      const isCEO =
        identity && group.ceoIdentity.toHexString() === identity.toHexString();
      const isMember = memberships.some(
        (m) =>
          m.groupId === group.groupId &&
          m.userIdentity.toHexString() === identity?.toHexString()
      );
      return isCEO || isMember;
    })
    .map((group) => {
      const isCEO =
        identity && group.ceoIdentity.toHexString() === identity.toHexString();
      const membership = memberships.find(
        (m) =>
          m.groupId === group.groupId &&
          m.userIdentity.toHexString() === identity?.toHexString()
      );

      return {
        ...group,
        role: isCEO
          ? { tag: "CEO" as const }
          : membership?.permissionLevel || { tag: "Member" as const },
        memberCount: memberships.filter((m) => m.groupId === group.groupId)
          .length,
      };
    });

  const canManageGroup = (role: { tag: "CEO" | "Staff" | "Member" }) => {
    return role.tag === "CEO" || role.tag === "Staff";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Select Group to Administrate</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/site">
            <Building2 className="h-4 w-4 mr-2" />
            Site Admin
          </Link>
        </Button>
      </div>
      <div className="grid gap-4">
        {userGroups.map((group) => (
          <Card key={group.groupId} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  {group.logoUrl ? (
                    <img
                      src={group.logoUrl}
                      alt={group.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{group.name}</h2>
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: group.color || undefined }}
                      className={group.color ? "text-white" : ""}
                    >
                      {group.tag}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {group.memberCount} members • {getRoleLabel(group.role, group.ceoIdentity.toHexString() === identity?.toHexString())}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate(`/admin/dashboard/${group.groupId}`)}
                  disabled={!canManageGroup(group.role)}
                >
                  {canManageGroup(group.role) ? "Manage" : "View Only"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

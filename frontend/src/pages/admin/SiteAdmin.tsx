import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSpacetime } from "@/components/SpacetimeProvider";
import { useGroups } from "@/hooks/spacetimeHooks";
import { useNavigate } from "react-router-dom";

export default function SiteAdmin() {
  const { connection } = useSpacetime();
  const groups = useGroups(connection);
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Site Administration</h1>
        </div>
        <Button onClick={() => navigate("/admin/site/group/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Group
        </Button>
      </div>

      <div className="grid gap-6">
        {groups.map((group) => (
          <Card key={group.groupId} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={group.logoUrl} />
                  <AvatarFallback>
                    {group.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{group.name}</h2>
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: group.color || undefined }}
                      className={group.color ? "text-white" : ""}
                    >
                      {group.tag}
                    </Badge>{" "}
                  </div>
                  <p className="text-muted-foreground">{group.description}</p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      10 members
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      10 events
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(`/admin/groups/${group.groupId}/edit`)
                  }
                >
                  Edit Group
                </Button>
                <Button variant="destructive">Delete Group</Button>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  CEO: {group.ceoIdentity.toHexString()}
                </Badge>
                {group.ifvarbApproved && (
                  <Badge variant="secondary">IFVARB Approved</Badge>
                )}
                {group.websiteUrl && (
                  <a
                    href={group.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

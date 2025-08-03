import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock data for group members
const mockMembers = [
  {
    id: "1",
    name: "John Doe",
    role: "admin",
    avatarUrl: "https://github.com/shadcn.png",
    joinedAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Jane Smith",
    role: "member",
    avatarUrl: "https://github.com/shadcn.png",
    joinedAt: "2024-02-15",
  },
  {
    id: "3",
    name: "Mike Johnson",
    role: "member",
    avatarUrl: "https://github.com/shadcn.png",
    joinedAt: "2024-03-01",
  },
];

export default function AdminGroup() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Group Management</h1>
        <Button>Edit Group Profile</Button>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Group Members</h2>
              <Button variant="outline">Invite Member</Button>
            </div>
            <div className="space-y-4">
              {mockMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{member.name}</h3>
                        <Badge
                          variant={
                            member.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit Role
                    </Button>
                    <Button variant="destructive" size="sm">
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Group Settings</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Group Name</h3>
                <p className="text-muted-foreground">Tech Enthusiasts Club</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">
                  A community of tech enthusiasts sharing knowledge and
                  experiences.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Privacy</h3>
                <p className="text-muted-foreground">Public</p>
              </div>
              <Button>Save Changes</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

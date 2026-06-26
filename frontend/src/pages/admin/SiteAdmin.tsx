import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpacetimeDB } from "spacetimedb/react";
import { Identity } from "spacetimedb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Check, Plus, Search, Shield, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useHasSuperAdmins,
  useGroupApplications,
  useGroups,
  useIsSuperAdmin,
  useSuperAdmins,
  useUsers,
} from "@/hooks/spacetimeHooks";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function SiteAdmin() {
  const navigate = useNavigate();
  const { identity, getConnection } = useSpacetimeDB();
  const connection = getConnection();

  const groups = useGroups();
  const applications = useGroupApplications();
  const superAdmins = useSuperAdmins();
  const users = useUsers();
  const hasSuperAdmins = useHasSuperAdmins();

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = useIsSuperAdmin();

  const pendingApplications = useMemo(
    () =>
      applications
        .filter((app) => app.status.tag === "Pending")
        .sort(
          (a, b) =>
            b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        ),
    [applications]
  );

  const allApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) =>
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      ),
    [applications]
  );

  const resolveUserName = (idHex?: string) => {
    if (!idHex) return "Unknown User";
    const user = users.find((u) => u.identity.toHexString() === idHex);
    return user?.displayName || `${idHex.slice(0, 8)}...`;
  };

  const superAdminIdentitySet = useMemo(
    () => new Set(superAdmins.map((admin) => admin.identity.toHexString())),
    [superAdmins]
  );

  const availableUsers = useMemo(
    () =>
      users.filter((u) => !superAdminIdentitySet.has(u.identity.toHexString())),
    [users, superAdminIdentitySet]
  );

  const filteredUsers = useMemo(
    () =>
      availableUsers.filter((user) =>
        (user.displayName || "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      ),
    [availableUsers, searchQuery]
  );

  const onApprove = async (applicationId: bigint) => {
    if (!connection) return;
    const key = applicationId.toString();
    await connection.reducers.approveGroupApplication({
      applicationId,
      reviewNote: reviewNotes[key]?.trim() || undefined,
    });
    setReviewNotes((prev) => ({ ...prev, [key]: "" }));
  };

  const onReject = async (applicationId: bigint) => {
    if (!connection) return;
    const key = applicationId.toString();
    await connection.reducers.rejectGroupApplication({
      applicationId,
      reviewNote: reviewNotes[key]?.trim() || undefined,
    });
    setReviewNotes((prev) => ({ ...prev, [key]: "" }));
  };

  const onGrantSuperAdmin = async () => {
    if (!connection || !selectedUserId) return;

    await connection.reducers.grantSuperAdmin({
      identity: Identity.fromString(selectedUserId),
    });
    setShowGrantDialog(false);
    setSelectedUserId("");
    setSearchQuery("");
  };

  const onRevokeSuperAdmin = async (adminIdentity: string) => {
    if (!connection) return;
    await connection.reducers.revokeSuperAdmin({
      identity: Identity.fromString(adminIdentity),
    });
  };

  if (!isSuperAdmin) {
    return (
      <Card className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Global Admin Access Required
        </h1>
        <p className="text-muted-foreground mb-4">
          You need super admin permissions to access this page.
        </p>
        <Button variant="outline" onClick={() => navigate("/admin")}>
          Back to Admin
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {!hasSuperAdmins && (
        <Card className="p-4 border-yellow-500/40 bg-yellow-500/10">
          <p className="text-sm">
            Bootstrap mode: no super admins exist yet. The first super-admin
            action performed here will initialize your account as super admin.
          </p>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Global Admin</h1>
        </div>
        <Button onClick={() => navigate("/admin/site/group/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Group
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Pending Group Applications</h2>
        {pendingApplications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending applications.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingApplications.map((app) => {
              const key = app.applicationId.toString();
              const applicantHex = app.applicantIdentity.toHexString();
              return (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {app.name} ({app.tag})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Applicant: {resolveUserName(applicantHex)} (
                        {applicantHex.slice(0, 16)}...)
                      </p>
                    </div>
                    <Badge>Pending</Badge>
                  </div>
                  <p className="text-sm">{app.description}</p>
                  <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Website: {app.websiteUrl || "-"}</div>
                    <div>Logo: {app.logoUrl || "-"}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`review-${key}`}>
                      Review Note (Optional)
                    </Label>
                    <Textarea
                      id={`review-${key}`}
                      value={reviewNotes[key] || ""}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => onReject(app.applicationId)}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button onClick={() => onApprove(app.applicationId)}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Super Admin Management</h2>
        <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
          <DialogTrigger asChild>
            <Button className="w-fit">Grant Super Admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Super Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="super-admin-user">Select User</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger id="super-admin-user">
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
                    {filteredUsers.map((user) => (
                      <SelectItem
                        key={user.identity.toHexString()}
                        value={user.identity.toHexString()}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.ifcProfileUrl} />
                            <AvatarFallback>
                              {(user.displayName || "U")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
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
              <Button
                onClick={onGrantSuperAdmin}
                className="w-full"
                disabled={!selectedUserId}
              >
                Grant Super Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <div className="space-y-2">
          {superAdmins.map((admin) => {
            const idHex = admin.identity.toHexString();
            const isSelf = identity?.toHexString() === idHex;
            return (
              <div
                key={idHex}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <div className="text-sm">
                  <div className="font-medium">{resolveUserName(idHex)}</div>
                  <div className="text-muted-foreground">{idHex}</div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onRevokeSuperAdmin(idHex)}
                  disabled={isSelf}
                >
                  Revoke
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Separator />

      <div className="grid gap-6">
        <h2 className="text-xl font-semibold">Groups</h2>
        {groups.map((group) => (
          <Card key={group.groupId} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={group.logoUrl} />
                  <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{group.name}</h2>
                    <Badge>{group.tag}</Badge>
                    {group.ifvarbApproved && (
                      <Badge variant="secondary">Approved</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{group.description}</p>
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
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold">Application History</h2>
        {allApplications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No applications found.
          </p>
        ) : (
          <div className="space-y-2">
            {allApplications.map((app) => {
              const reviewerHex = app.reviewedBy?.toHexString();
              return (
                <div
                  key={app.applicationId.toString()}
                  className="text-sm border rounded-md p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {app.name} ({app.tag})
                    </span>
                    <Badge variant="outline">{app.status.tag}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Applicant:{" "}
                    {resolveUserName(app.applicantIdentity.toHexString())}
                  </div>
                  {reviewerHex && (
                    <div className="text-muted-foreground">
                      Reviewed by: {resolveUserName(reviewerHex)}
                    </div>
                  )}
                  {app.reviewNote && (
                    <div className="mt-1">Note: {app.reviewNote}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

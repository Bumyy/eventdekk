import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpacetimeDB } from "spacetimedb/react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useGroupApplications } from "@/hooks/spacetimeHooks";

export default function ApplyForGroup() {
  const navigate = useNavigate();
  const { identity, getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const applications = useGroupApplications();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    description: "",
    websiteUrl: "",
    logoUrl: "",
  });

  const myApplications = useMemo(() => {
    if (!identity) return [];
    return applications
      .filter(
        (app) => app.applicantIdentity.toHexString() === identity.toHexString()
      )
      .sort(
        (a, b) =>
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      );
  }, [applications, identity]);

  const hasPending = myApplications.some((app) => app.status.tag === "Pending");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection || hasPending) return;

    setIsSubmitting(true);
    try {
      await connection.reducers.applyForGroup({
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
      });

      setFormData({
        name: "",
        tag: "",
        description: "",
        websiteUrl: "",
        logoUrl: "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Apply for Group</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag">Group Tag</Label>
            <Input
              id="tag"
              value={formData.tag}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tag: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    websiteUrl: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin")}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || hasPending || !connection}
            >
              {isSubmitting
                ? "Submitting..."
                : hasPending
                  ? "Pending Review"
                  : "Submit"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">My Applications</h2>
        {myApplications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {myApplications.map((app) => (
              <div
                key={app.applicationId.toString()}
                className="border rounded-md p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {app.name} ({app.tag})
                  </div>
                  <Badge
                    variant={
                      app.status.tag === "Approved" ? "secondary" : "outline"
                    }
                  >
                    {app.status.tag}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {app.description}
                </p>
                {app.reviewNote && (
                  <p className="text-sm mt-2">Review: {app.reviewNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useSpacetimeDB } from "spacetimedb/react";

export default function CreateGroup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    description: "",
    websiteUrl: "",
    logoUrl: "",
  });
  const { getConnection } = useSpacetimeDB();
  const connection = getConnection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection) return;

    setIsLoading(true);
    try {
      connection.reducers.registerGroup({
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        websiteUrl: formData.websiteUrl,
        logoUrl: formData.logoUrl,
      });
      navigate("/admin/site");
    } catch (error) {
      console.error("Failed to create group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex items-center gap-2 mb-8">
        <Building2 className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Create New Group</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter group name"
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
              placeholder="Enter group tag"
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
              placeholder="Enter group description"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              value={formData.websiteUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))
              }
              placeholder="Enter website URL"
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={formData.logoUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))
              }
              placeholder="Enter logo URL"
              type="url"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/site")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

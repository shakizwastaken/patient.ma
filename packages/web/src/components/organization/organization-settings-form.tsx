"use client";

import { useState, useEffect } from "react";
import { authClient } from "@acme/shared/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle } from "lucide-react";

export function OrganizationSettingsForm() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logo: "",
    description: "",
  });

  useEffect(() => {
    if (activeOrganization) {
      setFormData({
        name: activeOrganization.name || "",
        slug: activeOrganization.slug || "",
        logo: activeOrganization.logo || "",
        description: activeOrganization.metadata?.description || "",
      });
    }
  }, [activeOrganization]);

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization) return;

    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      await authClient.organization.update({
        organizationId: activeOrganization.id,
        data: {
          name: formData.name,
          slug: formData.slug,
          logo: formData.logo || undefined,
          metadata: {
            description: formData.description,
          },
        },
      });
      setSuccess("Organization updated successfully!");
    } catch (err: any) {
      setError(
        err?.message || "Failed to update organization. Please try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!activeOrganization) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${activeOrganization.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      await authClient.organization.delete({
        organizationId: activeOrganization.id,
      });
      // Redirect to dashboard after deletion
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(
        err?.message || "Failed to delete organization. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeOrganization) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">No active organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Organization Details */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Update your organization's basic information
          </p>
        </div>

        <form onSubmit={handleUpdateOrganization} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter organization name"
                disabled={isUpdating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Organization Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="organization-slug"
                disabled={isUpdating}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              value={formData.logo}
              onChange={(e) =>
                setFormData({ ...formData, logo: e.target.value })
              }
              placeholder="https://example.com/logo.png"
              disabled={isUpdating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your organization..."
              disabled={isUpdating}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Organization"}
          </Button>
        </form>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Delete Organization</h4>
              <p className="text-muted-foreground mb-4 text-sm">
                Once you delete an organization, there is no going back. Please
                be certain.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteOrganization}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Organization"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

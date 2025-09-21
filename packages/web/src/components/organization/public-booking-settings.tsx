"use client";

import { useState, useEffect } from "react";
import { authClient } from "@acme/shared/client";
import { api } from "@/trpc/react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Link,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
} from "lucide-react";

// Extended organization type with our custom fields
interface ExtendedOrganization {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  publicBookingEnabled?: boolean;
  createdAt: Date;
}

export function PublicBookingSettings() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: organizationData } = api.organizations.getCurrent.useQuery();
  const [isUpdating, setIsUpdating] = useState(false);
  const [publicBookingEnabled, setPublicBookingEnabled] = useState(false);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [description, setDescription] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const utils = api.useUtils();

  // Initialize form data when organization is loaded
  // Use tRPC data for custom fields like publicBookingEnabled
  useEffect(() => {
    if (organizationData) {
      setPublicBookingEnabled(organizationData.publicBookingEnabled || false);
      setOrganizationSlug(organizationData.slug || "");
      setDescription(organizationData.description || "");
    }
  }, [organizationData]);

  // Update organization mutation
  const updateOrganization = api.organizations.update.useMutation({
    onSuccess: async (updatedOrg) => {
      toast.success("Public booking settings updated successfully");
      // Invalidate the organization query to refetch updated data
      await utils.organizations.getCurrent.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleSave = async () => {
    if (!activeOrganization) return;

    // Validate slug if public booking is enabled
    if (publicBookingEnabled && !organizationSlug.trim()) {
      toast.error("Organization slug is required for public booking");
      return;
    }

    setIsUpdating(true);
    try {
      await updateOrganization.mutateAsync({
        id: activeOrganization.id,
        publicBookingEnabled,
        slug: organizationSlug.trim() || null,
        description: description.trim() || null,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const generateSlug = () => {
    if (!activeOrganization?.name) return;

    const slug = activeOrganization.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim();

    setOrganizationSlug(slug);
  };

  const copyBookingUrl = async () => {
    const url = `${window.location.origin}/book/${organizationSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success("Booking URL copied to clipboard");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const openBookingPage = () => {
    const url = `${window.location.origin}/book/${organizationSlug}`;
    window.open(url, "_blank");
  };

  const hasChanges =
    publicBookingEnabled !==
      (organizationData?.publicBookingEnabled || false) ||
    organizationSlug !== (organizationData?.slug || "") ||
    description !== (organizationData?.description || "");

  const bookingUrl = organizationSlug
    ? `${window.location.origin}/book/${organizationSlug}`
    : "";

  if (!activeOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Public Booking Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Public Booking Settings
        </CardTitle>
        <CardDescription>
          Allow patients to book appointments online through a public link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Public Booking Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="public-booking-toggle">Enable Public Booking</Label>
            <p className="text-muted-foreground text-sm">
              Allow patients to book appointments through a public URL
            </p>
          </div>
          <Switch
            id="public-booking-toggle"
            checked={publicBookingEnabled}
            onCheckedChange={setPublicBookingEnabled}
          />
        </div>

        {publicBookingEnabled && (
          <>
            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="organization-slug">
                Public Booking URL Slug *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="organization-slug"
                  value={organizationSlug}
                  onChange={(e) => setOrganizationSlug(e.target.value)}
                  placeholder="your-clinic-name"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSlug}
                  disabled={!activeOrganization.name}
                >
                  Generate
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                This will be used in your public booking URL. Only lowercase
                letters, numbers, and hyphens are allowed.
              </p>

              {organizationSlug && (
                <div className="bg-muted mt-3 rounded-lg p-3">
                  <Label className="text-sm font-medium">
                    Your Public Booking URL:
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="bg-background flex-1 rounded p-2 font-mono text-sm">
                      {bookingUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyBookingUrl}
                      disabled={!organizationSlug}
                    >
                      {copiedUrl ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openBookingPage}
                      disabled={!organizationSlug || hasChanges}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  {hasChanges && (
                    <p className="mt-2 text-sm text-amber-600">
                      Save your changes to test the booking page
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Organization Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Organization Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your organization or services..."
                rows={3}
              />
              <p className="text-muted-foreground text-sm">
                This description will be shown on your public booking page. You
                can use the organization name:{" "}
                <strong>{activeOrganization.name}</strong>
              </p>
            </div>

            {/* Information Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Make sure you have:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Set up your availability schedule</li>
                  <li>Created at least one appointment type</li>
                  <li>
                    Configured online conferencing (if offering virtual
                    appointments)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Preview Information */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Globe className="mt-0.5 h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-blue-900">
                    Public Booking Page Preview
                  </h4>
                  <div className="mt-2 space-y-1 text-sm text-blue-700">
                    <p>
                      <strong>Title:</strong> Book with{" "}
                      {activeOrganization.name}
                    </p>
                    {description && (
                      <p>
                        <strong>Description:</strong> {description}
                      </p>
                    )}
                    {activeOrganization.logo && (
                      <p>
                        <strong>Logo:</strong> Your organization logo will be
                        displayed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={
              isUpdating ||
              !hasChanges ||
              (publicBookingEnabled && !organizationSlug.trim())
            }
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

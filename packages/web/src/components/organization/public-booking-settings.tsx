"use client";

import { useState, useEffect } from "react";
import { authClient } from "@acme/shared/client";
import { useSettingsForm, settingsValidators } from "@/hooks/use-settings-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";

// Form validation schema
const publicBookingSettingsSchema = z.object({
  publicBookingEnabled: z.boolean(),
});

type PublicBookingSettingsValues = z.infer<typeof publicBookingSettingsSchema>;

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
import { useOrganizationSettings } from "@/contexts/organization-settings-context";
import { toast } from "sonner";

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
  const [publicBookingEnabled, setPublicBookingEnabled] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Use global settings context
  const {
    organizationData,
    isUpdating,
    saveSettings,
    registerChanges,
    clearChanges,
  } = useOrganizationSettings();

  // Initialize form data when organization is loaded
  // Use tRPC data for custom fields like publicBookingEnabled
  useEffect(() => {
    if (organizationData) {
      setPublicBookingEnabled(organizationData.publicBookingEnabled || false);
      // Clear any pending changes for this component
      clearChanges("public-booking");
    }
  }, [organizationData, clearChanges]);

  // Watch for changes and register them globally with debouncing
  useEffect(() => {
    if (!organizationData) return;

    const timeoutId = setTimeout(() => {
      const originalValues = {
        publicBookingEnabled: organizationData.publicBookingEnabled || false,
      };

      // Check if values have changed
      const hasChanges =
        publicBookingEnabled !== originalValues.publicBookingEnabled;

      if (hasChanges) {
        registerChanges("public-booking", {
          publicBookingEnabled,
        });
      } else {
        clearChanges("public-booking");
      }
    }, 100); // 100ms debounce to prevent excessive updates

    return () => clearTimeout(timeoutId);
  }, [publicBookingEnabled, organizationData, registerChanges, clearChanges]);

  const copyBookingUrl = async () => {
    const slug = organizationData?.slug || "";
    const url = `${window.location.origin}/book/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success("URL de réservation copiée dans le presse-papiers");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast.error("Échec de la copie de l'URL");
    }
  };

  const openBookingPage = () => {
    const slug = organizationData?.slug || "";
    const url = `${window.location.origin}/book/${slug}`;
    window.open(url, "_blank");
  };

  const hasChanges =
    publicBookingEnabled !== (organizationData?.publicBookingEnabled || false);

  const bookingUrl = organizationData?.slug
    ? `${window.location.origin}/book/${organizationData.slug}`
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

        {publicBookingEnabled && organizationData?.slug && (
          <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Globe className="text-primary mt-0.5 h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="bg-background rounded px-2 py-1 font-mono text-sm">
                    {bookingUrl}
                  </code>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyBookingUrl}
                    disabled={!organizationData?.slug}
                  >
                    {copiedUrl ? (
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                    ) : (
                      <Copy className="mr-1 h-4 w-4" />
                    )}
                    {copiedUrl ? "Copié !" : "Copier l'URL"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openBookingPage}
                    disabled={!organizationData?.slug || hasChanges}
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Ouvrir la page
                  </Button>
                </div>
                {hasChanges && (
                  <p className="mt-2 text-sm text-amber-600">
                    Sauvegardez vos modifications pour tester la page de
                    réservation
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {publicBookingEnabled && !organizationData?.slug && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Veuillez configurer l'identifiant de votre cabinet dans les
              paramètres généraux pour activer la réservation publique.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

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
import { AppointmentTypesManager } from "./appointment-types-manager";
import { OnlineConferencingSettings } from "./online-conferencing-settings";
import { PublicBookingSettings } from "./public-booking-settings";
import { StripeSettings } from "./stripe-settings";
import {
  OrganizationSettingsProvider,
  useOrganizationSettings,
} from "@/contexts/organization-settings-context";
import { StickySaveBar } from "./sticky-save-bar";

// Component for basic organization settings that integrates with global context
function OrganizationBasicSettings() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { organizationData, registerChanges, clearChanges } =
    useOrganizationSettings();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logo: "",
    description: "",
  });

  useEffect(() => {
    if (organizationData) {
      const newFormData = {
        name: organizationData.name || "",
        slug: organizationData.slug || "",
        logo: organizationData.logo || "",
        description: organizationData.description || "",
      };
      setFormData(newFormData);
      clearChanges("basic-settings");
    }
  }, [organizationData, clearChanges]);

  // Watch for changes and register them globally with debouncing
  useEffect(() => {
    if (!organizationData) return;

    const timeoutId = setTimeout(() => {
      const originalValues = {
        name: organizationData.name || "",
        slug: organizationData.slug || "",
        logo: organizationData.logo || "",
        description: organizationData.description || "",
      };

      // Check if values have changed
      const hasChanges =
        formData.name !== originalValues.name ||
        formData.slug !== originalValues.slug ||
        formData.logo !== originalValues.logo ||
        formData.description !== originalValues.description;

      if (hasChanges) {
        registerChanges("basic-settings", {
          name: formData.name.trim(),
          slug: formData.slug.trim() || null,
          logo: formData.logo.trim() || null,
          description: formData.description.trim() || null,
        });
      } else {
        clearChanges("basic-settings");
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    formData.name,
    formData.slug,
    formData.logo,
    formData.description,
    organizationData,
    registerChanges,
    clearChanges,
  ]);

  // Function to sanitize slug input
  const sanitizeSlug = (input: string) => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .trim();
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeSlug(e.target.value);
    setFormData({ ...formData, slug: sanitized });
  };

  const generateSlug = () => {
    if (!formData.name) return;
    const slug = sanitizeSlug(formData.name);
    setFormData({ ...formData, slug });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres du cabinet</CardTitle>
        <CardDescription>
          Gérez les informations de base de votre cabinet médical
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom du cabinet *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Entrez le nom du cabinet"
              disabled={isUpdating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Identifiant du cabinet *</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="mon-cabinet-medical"
                className="font-mono"
                disabled={isUpdating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateSlug}
                disabled={!formData.name || isUpdating}
              >
                Générer
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Utilisé pour votre URL de réservation publique. Formatage
              automatique : majuscules deviennent minuscules, espaces deviennent
              des tirets.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logo">URL du logo</Label>
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
            <Label htmlFor="description">Description du cabinet</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Décrivez votre cabinet médical..."
              disabled={isUpdating}
              rows={3}
            />
            <p className="text-muted-foreground text-sm">
              Description optionnelle qui apparaîtra sur votre page de
              réservation publique.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Succès</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function OrganizationSettingsForm() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteOrganization = async () => {
    if (!activeOrganization) return;

    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer "${activeOrganization.name}" ? Cette action ne peut pas être annulée.`,
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
        err?.message ||
          "Échec de la suppression du cabinet. Veuillez réessayer.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeOrganization) {
    return (
      <div>
        <p className="text-muted-foreground">Aucun cabinet actif sélectionné</p>
      </div>
    );
  }

  return (
    <OrganizationSettingsProvider>
      <div className="space-y-8">
        {/* Organization Basic Settings */}
        <OrganizationBasicSettings />

        <Separator />

        {/* Public Booking Settings */}
        <div className="space-y-6">
          <PublicBookingSettings />
        </div>

        <Separator />

        {/* Stripe Settings */}
        <div className="space-y-6">
          <StripeSettings />
        </div>

        <Separator />

        {/* Online Conferencing Settings */}
        <div className="space-y-6">
          <OnlineConferencingSettings />
        </div>

        <Separator />

        {/* Appointment Types Management */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Types de rendez-vous</h3>
            <p className="text-muted-foreground">
              Gérez les types de rendez-vous et leurs durées par défaut
            </p>
          </div>
          <AppointmentTypesManager />
        </div>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
            <CardDescription>
              Actions irréversibles et destructives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">Supprimer le cabinet</h4>
                <p className="text-muted-foreground mb-4 text-sm">
                  Une fois que vous supprimez un cabinet, il n'y a pas de retour
                  en arrière. Veuillez être certain.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteOrganization}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Suppression..." : "Supprimer le cabinet"}
                </Button>
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Save Bar */}
      <StickySaveBar />
    </OrganizationSettingsProvider>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { OrganizationSettingsProvider } from "@/contexts/organization-settings-context";
import { StickySaveBar } from "./sticky-save-bar";

export function OrganizationSettingsForm() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const searchParams = useSearchParams();
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

  // Handle Google integration success/error messages
  useEffect(() => {
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (successParam === "google_integrated") {
      setSuccess("Google Calendar intégré avec succès !");
      setError("");
      // Clear the URL parameters
      window.history.replaceState({}, "", window.location.pathname);
    } else if (errorParam) {
      setError(
        errorParam === "google_auth_failed"
          ? "Échec de l'authentification Google"
          : errorParam === "missing_parameters"
            ? "Paramètres manquants dans la réponse Google"
            : errorParam === "integration_failed"
              ? "Échec de l'intégration Google"
              : "Erreur inconnue lors de l'intégration Google",
      );
      setSuccess("");
      // Clear the URL parameters
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

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
          // TODO: Add timezone support when the API is updated
          // timezone: formData.timezone,
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
        <p className="text-muted-foreground">Aucun cabinet actif sélectionné</p>
      </div>
    );
  }

  return (
    <OrganizationSettingsProvider>
      <div className="space-y-8">
        {/* Organization Details */}
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">
              Mettre à jour les informations de base de votre cabinet
            </p>
          </div>

          <form onSubmit={handleUpdateOrganization} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom du cabinet</Label>
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
                <Label htmlFor="slug">Identifiant du cabinet</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="cabinet-identifiant"
                  disabled={isUpdating}
                />
              </div>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Décrivez votre cabinet..."
                disabled={isUpdating}
                rows={3}
              />
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
                <CheckCircle />
                <AlertTitle>Succès</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Mise à jour..." : "Mettre à jour le cabinet"}
            </Button>
          </form>
        </div>

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

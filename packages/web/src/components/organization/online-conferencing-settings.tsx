"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Video,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export function OnlineConferencingSettings() {
  const [onlineConferencingEnabled, setOnlineConferencingEnabled] =
    useState(false);
  const [selectedAppointmentTypeId, setSelectedAppointmentTypeId] = useState<
    string | null
  >(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch current configuration and appointment types
  const { data: appointmentConfig, isLoading: configLoading } =
    api.availability.getAppointmentConfig.useQuery();

  const { data: appointmentTypes, isLoading: typesLoading } =
    api.appointmentTypes.getAppointmentTypes.useQuery();

  // Google integration queries
  const { data: integrationStatus } =
    api.googleIntegration.getIntegrationStatus.useQuery();
  const { data: authUrl } = api.googleIntegration.getAuthUrl.useQuery();

  const utils = api.useUtils();

  // Update mutation
  const updateMutation =
    api.availability.updateOnlineConferencingSettings.useMutation({
      onSuccess: () => {
        toast.success("Paramètres de visioconférence mis à jour avec succès");
        utils.availability.getAppointmentConfig.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la mise à jour");
      },
    });

  // Google integration mutation
  const disableIntegration =
    api.googleIntegration.disableIntegration.useMutation({
      onSuccess: () => {
        toast.success("Intégration Google désactivée");
        utils.googleIntegration.getIntegrationStatus.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la désactivation");
      },
    });

  // Initialize form data when config is loaded
  useEffect(() => {
    if (appointmentConfig) {
      setOnlineConferencingEnabled(
        appointmentConfig.onlineConferencingEnabled || false,
      );
      setSelectedAppointmentTypeId(
        appointmentConfig.onlineConferencingAppointmentTypeId || null,
      );
    }
  }, [appointmentConfig]);

  const handleSave = async () => {
    if (!onlineConferencingEnabled && selectedAppointmentTypeId) {
      toast.error(
        "Vous ne pouvez pas sélectionner un type de rendez-vous si la visioconférence est désactivée",
      );
      return;
    }

    if (onlineConferencingEnabled && !selectedAppointmentTypeId) {
      toast.error(
        "Veuillez sélectionner un type de rendez-vous pour la visioconférence",
      );
      return;
    }

    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({
        onlineConferencingEnabled,
        onlineConferencingAppointmentTypeId: onlineConferencingEnabled
          ? selectedAppointmentTypeId
          : null,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges =
    onlineConferencingEnabled !==
      (appointmentConfig?.onlineConferencingEnabled || false) ||
    selectedAppointmentTypeId !==
      (appointmentConfig?.onlineConferencingAppointmentTypeId || null);

  if (configLoading || typesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Paramètres de visioconférence
          </CardTitle>
          <CardDescription>
            Configurez les paramètres pour les rendez-vous en ligne
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAppointmentTypes =
    appointmentTypes?.filter((type) => type.isActive) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Paramètres de visioconférence
        </CardTitle>
        <CardDescription>
          Configurez les paramètres pour les rendez-vous en ligne
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Online Conferencing Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="online-conferencing-toggle">
              Activer la visioconférence
            </Label>
            <p className="text-muted-foreground text-sm">
              Permettre aux patients de prendre des rendez-vous en ligne
            </p>
          </div>
          <Switch
            id="online-conferencing-toggle"
            checked={onlineConferencingEnabled}
            onCheckedChange={setOnlineConferencingEnabled}
          />
        </div>

        {/* Appointment Type Selector */}
        {onlineConferencingEnabled && (
          <div className="space-y-2">
            <Label htmlFor="appointment-type-select">
              Type de rendez-vous pour la visioconférence
            </Label>
            <Select
              value={selectedAppointmentTypeId || ""}
              onValueChange={(value) =>
                setSelectedAppointmentTypeId(value || null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type de rendez-vous" />
              </SelectTrigger>
              <SelectContent>
                {activeAppointmentTypes.length === 0 ? (
                  <SelectItem value="" disabled>
                    Aucun type de rendez-vous disponible
                  </SelectItem>
                ) : (
                  activeAppointmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              (type.color as string) || "#3b82f6",
                          }}
                        />
                        {type.name}
                        {type.description && (
                          <span className="text-muted-foreground text-xs">
                            - {type.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {activeAppointmentTypes.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Vous devez créer au moins un type de rendez-vous actif pour
                  pouvoir utiliser la visioconférence.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Google Calendar Integration */}
        {onlineConferencingEnabled && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Intégration Google Calendar</Label>
                  <p className="text-muted-foreground text-sm">
                    Connectez votre Google Calendar pour créer automatiquement
                    des liens de réunion
                  </p>
                </div>

                {integrationStatus?.isIntegrated ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">Connecté</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disableIntegration.mutate()}
                      disabled={disableIntegration.isPending}
                    >
                      {disableIntegration.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Déconnecter"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      if (authUrl?.authUrl) {
                        window.location.href = authUrl.authUrl;
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Intégrer Google
                  </Button>
                )}
              </div>
            </div>

            {!integrationStatus?.isIntegrated && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Vous devez intégrer Google Calendar pour créer automatiquement
                  des liens de réunion pour les rendez-vous en ligne.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Information Alert */}
        {onlineConferencingEnabled && integrationStatus?.isIntegrated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Quand la visioconférence est activée, les patients pourront
              prendre des rendez-vous en ligne du type sélectionné. Les liens de
              visioconférence seront générés automatiquement.
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={
              isUpdating ||
              !hasChanges ||
              (onlineConferencingEnabled && !selectedAppointmentTypeId)
            }
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? "Mise à jour..." : "Enregistrer les paramètres"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { XCircle, Calendar, ArrowLeft, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BookingCancelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const appointmentId = searchParams.get("appointment_id");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, you might want to:
    // 1. Cancel the appointment in the database
    // 2. Send a cancellation notification
    // For now, we'll just show the cancellation message
    setLoading(false);
  }, [appointmentId]);

  const handleRetryBooking = () => {
    window.location.href = `/book/${slug}`;
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-4">
            Traitement de l'annulation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <XCircle className="text-destructive h-8 w-8" />
          </div>
          <h1 className="text-foreground text-3xl font-bold">
            Paiement annulé
          </h1>
          <p className="text-muted-foreground mt-2">
            Votre réservation n'a pas été finalisée
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Que s'est-il passé ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Le paiement a été annulé et votre rendez-vous n'a pas été
                confirmé. Aucun montant n'a été débité de votre carte.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">Options disponibles :</h4>
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Essayer à nouveau avec une autre méthode de paiement
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Choisir un créneau différent
                </li>
                <li className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Revenir à la page de réservation
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleRetryBooking} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer la réservation
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Besoin d'aide ? Contactez directement l'organisation pour une
            assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

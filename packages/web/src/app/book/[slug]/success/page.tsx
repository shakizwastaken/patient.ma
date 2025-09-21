"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, Clock, Video, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BookingSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const sessionId = searchParams.get("session_id");

  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, you would fetch appointment details
    // using the session ID to get the appointment from Stripe metadata
    // For now, we'll show a generic success message
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-4">
            Vérification du paiement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <CheckCircle className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-foreground text-3xl font-bold">
            Paiement confirmé !
          </h1>
          <p className="text-muted-foreground mt-2">
            Votre rendez-vous a été réservé avec succès
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Détails de votre rendez-vous
            </CardTitle>
            <CardDescription>
              Un e-mail de confirmation vous a été envoyé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-primary mt-0.5 h-5 w-5" />
                <div>
                  <h4 className="text-primary font-medium">
                    Paiement traité avec succès
                  </h4>
                  <p className="text-primary/80 text-sm">
                    Votre rendez-vous est maintenant confirmé. Vous recevrez
                    bientôt un e-mail de confirmation avec tous les détails.
                  </p>
                  {sessionId && (
                    <p className="text-primary/70 mt-2 text-xs">
                      ID de session: {sessionId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="text-muted-foreground h-4 w-4" />
                <span>E-mail de confirmation envoyé</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Video className="text-muted-foreground h-4 w-4" />
                <span>Invitation Google Calendar incluse (si applicable)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span>Rappel automatique avant le rendez-vous</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => window.close()} className="flex-1">
                Fermer
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = `mailto:?subject=Confirmation de rendez-vous&body=Mon rendez-vous a été confirmé avec succès.`)
                }
              >
                Partager
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Besoin d'aide ? Contactez directement l'organisation.
          </p>
        </div>
      </div>
    </div>
  );
}

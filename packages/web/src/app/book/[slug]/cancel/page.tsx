"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
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
  const shouldSendEmail = searchParams.get("send_email") === "true";

  const [loading, setLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);

  const cancelPaymentMutation =
    api.publicBooking.handleCancelledPayment.useMutation();
  const retryPaymentMutation = api.publicBooking.retryPayment.useMutation({
    onSuccess: (result) => {
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    },
    onError: (error) => {
      console.error("Retry payment error:", error);
    },
  });

  // Get appointment details for better messaging
  const { data: appointmentDetails } =
    api.publicBooking.getAppointmentForRetry.useQuery(
      { appointmentId: appointmentId! },
      { enabled: !!appointmentId },
    );

  useEffect(() => {
    // Handle cancelled payment and send email only once
    if (appointmentId && shouldSendEmail && !emailSent) {
      setEmailSent(true);

      // Send email and update status
      cancelPaymentMutation.mutate(
        { appointmentId },
        {
          onSuccess: () => {
            console.log("Payment cancellation processed and email sent");
            // Remove send_email query param to prevent spam on reload
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("send_email");
            window.history.replaceState({}, "", newUrl.toString());
          },
          onError: (error) => {
            console.error("Error processing payment cancellation:", error);
          },
          onSettled: () => {
            setLoading(false);
          },
        },
      );
    } else {
      setLoading(false);
    }
  }, [appointmentId, shouldSendEmail, emailSent]);

  const handleChangeDetails = () => {
    if (appointmentId) {
      // Redirect to pre-filled retry booking form
      window.location.href = `/book/${slug}?retry=${appointmentId}`;
    } else {
      // Fallback to regular booking page
      window.location.href = `/book/${slug}`;
    }
  };

  const handleContinuePayment = () => {
    if (appointmentId) {
      // Direct payment retry using the mutation
      retryPaymentMutation.mutate({ appointmentId });
    }
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
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Centered Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <RefreshCw className="h-10 w-10 text-orange-600" />
          </div>
          <h1 className="text-foreground mb-2 text-2xl font-bold">
            Transaction incomplète
          </h1>
          <p className="text-muted-foreground text-sm">
            Finalisons votre réservation ensemble
          </p>
        </div>

        {/* Simplified Card */}
        <Card>
          <CardContent className="space-y-6 pt-6 pb-6 text-center">
            <Alert>
              <AlertDescription className="text-center">
                {shouldSendEmail ? (
                  <>
                    Aucun montant n'a été débité de votre carte. Un e-mail de
                    relance vous a été envoyé.
                  </>
                ) : (
                  <>
                    Votre rendez-vous est en attente de paiement. Choisissez une
                    option ci-dessous pour continuer.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleChangeDetails}
                className="w-full"
                size="lg"
              >
                Changer les détails et réessayer
              </Button>

              {appointmentId && (
                <Button
                  onClick={handleContinuePayment}
                  disabled={retryPaymentMutation.isPending}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {retryPaymentMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Redirection vers le paiement...
                    </div>
                  ) : (
                    "Continuer vers le paiement"
                  )}
                </Button>
              )}
            </div>

            <p className="text-muted-foreground text-xs">
              Besoin d'aide ? Contactez l'organisation directement.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

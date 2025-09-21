"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";

export default function RetryPaymentRedirect() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;

  // Get appointment details to get the organization slug
  const { data: appointmentDetails } =
    api.publicBooking.getAppointmentForRetry.useQuery(
      { appointmentId },
      { enabled: !!appointmentId },
    );

  useEffect(() => {
    if (appointmentDetails?.organizationSlug) {
      // Redirect to the cancel page which now handles everything
      window.location.href = `/book/${appointmentDetails.organizationSlug}/cancel?appointment_id=${appointmentId}`;
    }
  }, [appointmentDetails, appointmentId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600"></div>
        <p className="mt-4 text-gray-600">Redirection...</p>
      </div>
    </div>
  );
}

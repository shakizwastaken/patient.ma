import { db } from "@acme/shared/server";
import {
  appointment,
  organizationAppointmentType,
  organization,
} from "@acme/shared/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export interface CreateAppointmentParams {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  appointmentTypeId: string;
  patientId: string;
  organizationId: string;
  createdById?: string; // Optional for public bookings
  meetingLink?: string;
  meetingId?: string;
}

export interface CreateAppointmentResult {
  appointmentId: string;
  requiresPayment: boolean;
  checkoutUrl?: string; // Only present if payment is required
  sessionId?: string; // Only present if payment is required
}

export async function createAppointment(
  params: CreateAppointmentParams,
  patientEmail: string,
  patientName: string,
  successUrl?: string,
  cancelUrl?: string,
): Promise<CreateAppointmentResult | null> {
  try {
    // Get appointment type to check if payment is required
    const [appointmentType] = await db
      .select()
      .from(organizationAppointmentType)
      .where(eq(organizationAppointmentType.id, params.appointmentTypeId))
      .limit(1);

    if (!appointmentType) {
      throw new Error("Appointment type not found");
    }

    // Create the appointment in the database
    const [newAppointment] = await db
      .insert(appointment)
      .values({
        title: params.title,
        description: params.description,
        startTime: params.startTime,
        endTime: params.endTime,
        appointmentTypeId: params.appointmentTypeId,
        patientId: params.patientId,
        organizationId: params.organizationId,
        createdById: params.createdById,
        meetingLink: params.meetingLink,
        meetingId: params.meetingId,
        // Set initial status and payment info based on whether payment is required
        status: appointmentType.requiresPayment ? "scheduled" : "confirmed",
        paymentStatus: appointmentType.requiresPayment
          ? "pending"
          : "not_required",
      })
      .returning();

    if (!newAppointment) {
      throw new Error("Failed to create appointment");
    }

    // If payment is not required, we're done
    if (!appointmentType.requiresPayment) {
      return {
        appointmentId: newAppointment.id,
        requiresPayment: false,
      };
    }

    // If payment is required, create Stripe checkout session
    if (!appointmentType.stripePriceId) {
      throw new Error("No Stripe price configured for this appointment type");
    }

    if (!successUrl || !cancelUrl) {
      throw new Error(
        "Success and cancel URLs are required for paid appointments",
      );
    }

    const checkoutSession = await createStripeCheckoutSession({
      organizationId: params.organizationId,
      appointmentId: newAppointment.id,
      appointmentTypeId: params.appointmentTypeId,
      patientEmail,
      patientName,
      successUrl,
      cancelUrl,
    });

    if (!checkoutSession) {
      // If Stripe checkout fails, we should probably delete the appointment
      // or mark it as failed
      await db
        .update(appointment)
        .set({
          status: "payment_failed",
          paymentStatus: "failed",
          notes: "Failed to create Stripe checkout session",
        })
        .where(eq(appointment.id, newAppointment.id));

      throw new Error("Failed to create payment checkout session");
    }

    // Update appointment with Stripe session ID
    await db
      .update(appointment)
      .set({
        stripeCheckoutSessionId: checkoutSession.sessionId,
      })
      .where(eq(appointment.id, newAppointment.id));

    return {
      appointmentId: newAppointment.id,
      requiresPayment: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.sessionId,
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return null;
  }
}

// Stripe checkout session creation (only for paid appointments)
interface CreateCheckoutSessionParams {
  organizationId: string;
  appointmentId: string;
  appointmentTypeId: string;
  patientEmail: string;
  patientName: string;
  successUrl: string;
  cancelUrl: string;
}

async function createStripeCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<{ url: string; sessionId: string } | null> {
  try {
    // Get organization Stripe configuration
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, params.organizationId))
      .limit(1);

    if (!org?.stripeSecretKey || !org.stripeEnabled) {
      throw new Error("Stripe not configured for this organization");
    }

    // Get appointment type payment configuration
    const [appointmentType] = await db
      .select()
      .from(organizationAppointmentType)
      .where(eq(organizationAppointmentType.id, params.appointmentTypeId))
      .limit(1);

    if (!appointmentType?.requiresPayment || !appointmentType.stripePriceId) {
      throw new Error("Invalid payment configuration");
    }

    // Initialize Stripe with organization's secret key
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode:
        appointmentType.paymentType === "subscription"
          ? "subscription"
          : "payment",
      customer_email: params.patientEmail,
      line_items: [
        {
          price: appointmentType.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        organizationId: params.organizationId,
        appointmentId: params.appointmentId,
        appointmentTypeId: params.appointmentTypeId,
        patientEmail: params.patientEmail,
        patientName: params.patientName,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return null;
  }
}

// Confirm a free appointment (no payment required)
export async function confirmFreeAppointment(
  appointmentId: string,
): Promise<boolean> {
  try {
    await db
      .update(appointment)
      .set({
        status: "confirmed",
        paymentStatus: "not_required",
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    return true;
  } catch (error) {
    console.error("Error confirming free appointment:", error);
    return false;
  }
}

// Cancel an appointment and handle refunds if necessary
export async function cancelAppointment(
  appointmentId: string,
  reason?: string,
  refundAmount?: number,
): Promise<boolean> {
  try {
    // Get appointment details
    const [apt] = await db
      .select()
      .from(appointment)
      .where(eq(appointment.id, appointmentId))
      .limit(1);

    if (!apt) {
      throw new Error("Appointment not found");
    }

    // If appointment was paid and has a payment intent, create refund
    if (apt.paymentStatus === "paid" && apt.stripePaymentIntentId) {
      const refundResult = await refundStripePayment({
        organizationId: apt.organizationId,
        paymentIntentId: apt.stripePaymentIntentId,
        amount: refundAmount,
        reason: "requested_by_customer",
      });

      if (refundResult) {
        // Update appointment with refund information
        await db
          .update(appointment)
          .set({
            status: "cancelled",
            paymentStatus: "refunded",
            notes: `${apt.notes || ""}\nCancelled with refund: ${refundResult.refund.id}${reason ? ` - Reason: ${reason}` : ""}`,
            updatedAt: new Date(),
          })
          .where(eq(appointment.id, appointmentId));
      } else {
        // Mark as cancelled even if refund failed
        await db
          .update(appointment)
          .set({
            status: "cancelled",
            notes: `${apt.notes || ""}\nCancelled (refund failed)${reason ? ` - Reason: ${reason}` : ""}`,
            updatedAt: new Date(),
          })
          .where(eq(appointment.id, appointmentId));
      }
    } else {
      // Free appointment or no payment - just cancel
      await db
        .update(appointment)
        .set({
          status: "cancelled",
          notes: `${apt.notes || ""}${reason ? `\nCancelled - Reason: ${reason}` : "\nCancelled"}`,
          updatedAt: new Date(),
        })
        .where(eq(appointment.id, appointmentId));
    }

    return true;
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return false;
  }
}

// Helper function for refunds (only used internally)
async function refundStripePayment(params: {
  organizationId: string;
  paymentIntentId: string;
  amount?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}): Promise<{ refund: Stripe.Refund } | null> {
  try {
    // Get organization Stripe configuration
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, params.organizationId))
      .limit(1);

    if (!org?.stripeSecretKey || !org.stripeEnabled) {
      throw new Error("Stripe not configured for this organization");
    }

    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const refund = await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount,
      reason: params.reason,
    });

    return { refund };
  } catch (error) {
    console.error("Error creating Stripe refund:", error);
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@acme/shared/server";
import {
  organization,
  appointment,
  organizationAppointmentConfig,
  patient,
} from "@acme/shared/server";
import { eq } from "drizzle-orm";
import { GoogleCalendarService, emailService } from "@acme/shared/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;

  if (!orgId) {
    console.error("No organization ID provided in webhook URL");
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 },
    );
  }

  // Get raw body for signature verification - following Pedro's pattern
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    console.error("No Stripe signature found");
    return NextResponse.json(
      { error: "No Stripe signature found" },
      { status: 400 },
    );
  }

  try {
    // Get the specific organization's Stripe configuration
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    if (
      !org?.stripeSecretKey ||
      !org?.stripeWebhookSecret ||
      !org.stripeEnabled
    ) {
      console.error(
        `Stripe not properly configured for organization: ${orgId}`,
      );
      return NextResponse.json(
        { error: "Stripe not configured for this organization" },
        { status: 400 },
      );
    }

    // Initialize Stripe with organization's secret key - following Pedro's pattern
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Verify webhook signature - following Pedro's error handling pattern
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        org.stripeWebhookSecret,
      );
    } catch (err: any) {
      console.error(
        `Webhook signature verification failed for org ${orgId}: ${err.message}`,
      );
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 },
      );
    }

    console.log(
      `Processing webhook event: ${event.type} for organization: ${orgId}`,
    );

    // Handle different event types - following Pedro's switch pattern
    switch (event.type) {
      case "checkout.session.completed":
        // Handle successful checkout - one-time payments
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          orgId,
        );
        break;

      case "checkout.session.expired":
        // Handle expired checkout session - send retry email
        await handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
          orgId,
        );
        break;

      case "payment_intent.succeeded":
        // Handle successful payment intent
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          orgId,
        );
        break;

      case "payment_intent.payment_failed":
        // Handle failed payment intent
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          orgId,
        );
        break;

      case "invoice.payment_succeeded":
        // Handle successful subscription payment
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          orgId,
        );
        break;

      case "invoice.payment_failed":
        // Handle failed subscription payment
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          orgId,
        );
        break;

      case "customer.subscription.created":
        // Handle new subscription created
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
          orgId,
        );
        break;

      case "customer.subscription.updated":
        // Handle subscription updates (plan changes, etc.)
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          orgId,
        );
        break;

      case "customer.subscription.deleted":
        // Handle subscription cancellation
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          orgId,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type} for org: ${orgId}`);
    }

    // Return success response - following Pedro's pattern
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to create meeting link after payment confirmation
async function createMeetingLinkForPaidAppointment(
  appointmentId: string,
  organizationId: string,
) {
  try {
    // Get appointment details
    const [appointmentDetails] = await db
      .select()
      .from(appointment)
      .where(eq(appointment.id, appointmentId))
      .limit(1);

    if (!appointmentDetails) {
      console.error(`Appointment ${appointmentId} not found`);
      return;
    }

    // Get patient details
    const [patientDetails] = await db
      .select()
      .from(patient)
      .where(eq(patient.id, appointmentDetails.patientId))
      .limit(1);

    if (!patientDetails) {
      console.error(`Patient for appointment ${appointmentId} not found`);
      return;
    }

    // Get organization details
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      console.error(`Organization ${organizationId} not found`);
      return;
    }

    // Check if online conferencing is enabled
    const [config] = await db
      .select()
      .from(organizationAppointmentConfig)
      .where(eq(organizationAppointmentConfig.organizationId, organizationId))
      .limit(1);

    if (
      !config?.onlineConferencingEnabled ||
      appointmentDetails.appointmentTypeId !==
        config.onlineConferencingAppointmentTypeId
    ) {
      console.log(
        "Online conferencing not enabled or not required for this appointment type",
      );
      return;
    }

    if (!org.googleIntegrationEnabled || !org.googleAccessToken) {
      console.log("Google integration not enabled for organization");
      return;
    }

    // Create Google Calendar service
    const calendarService = new GoogleCalendarService(
      org.googleAccessToken!,
      org.googleRefreshToken || undefined,
      async (newAccessToken: string, expiryDate?: Date) => {
        await db
          .update(organization)
          .set({
            googleAccessToken: newAccessToken,
            googleTokenExpiresAt: expiryDate,
          })
          .where(eq(organization.id, organizationId));
      },
    );

    // Create the meeting event
    const meetingResult = await calendarService.createMeetingEvent({
      summary: appointmentDetails.title,
      description: appointmentDetails.description || undefined,
      startTime: appointmentDetails.startTime.toISOString(),
      endTime: appointmentDetails.endTime.toISOString(),
      attendeeEmails: [patientDetails.email!],
    });

    // Update appointment with meeting details
    await db
      .update(appointment)
      .set({
        meetingLink: meetingResult.meetingLink,
        meetingId: meetingResult.eventId || null, // Use eventId instead of meetingId
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    console.log(
      `✅ Meeting link created for paid appointment ${appointmentId}: ${meetingResult.meetingLink}`,
    );
    console.log(
      `📧 Google Calendar invitation sent to: ${patientDetails.email}`,
    );

    return meetingResult;
  } catch (error) {
    console.error("Error creating meeting link for paid appointment:", error);
  }
}

// Helper function to send payment retry email
async function sendPaymentRetryEmail(
  appointmentId: string,
  organizationId: string,
) {
  try {
    // Get appointment details
    const [appointmentDetails] = await db
      .select()
      .from(appointment)
      .where(eq(appointment.id, appointmentId))
      .limit(1);

    if (!appointmentDetails) {
      console.error(`Appointment ${appointmentId} not found`);
      return;
    }

    // Get patient details
    const [patientDetails] = await db
      .select()
      .from(patient)
      .where(eq(patient.id, appointmentDetails.patientId))
      .limit(1);

    if (!patientDetails) {
      console.error(`Patient for appointment ${appointmentId} not found`);
      return;
    }

    // Get organization details
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      console.error(`Organization ${organizationId} not found`);
      return;
    }

    // Create retry payment URL - now using the cancel page
    const retryUrl = `${process.env.BETTER_AUTH_URL}/book/${org.slug}/cancel?appointment_id=${appointmentId}`;

    // Send retry payment email
    const emailResult = await emailService.sendPaymentRetryEmail({
      to: patientDetails.email!,
      patientName: `${patientDetails.firstName} ${patientDetails.lastName}`,
      organizationName: org.name,
      organizationLogo: org.logo || undefined,
      appointmentTitle: appointmentDetails.title,
      appointmentDate: appointmentDetails.startTime.toLocaleDateString("fr-FR"),
      appointmentTime: appointmentDetails.startTime.toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      ),
      retryPaymentUrl: retryUrl,
    });

    if (emailResult.error) {
      console.error("Failed to send retry payment email:", emailResult.error);
    } else {
      console.log(`✅ Payment retry email sent to: ${patientDetails.email}`);
    }
  } catch (error) {
    console.error("Error sending payment retry email:", error);
  }
}

// Handle successful checkout session (one-time payments)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  organizationId: string,
) {
  try {
    console.log(
      `Checkout session completed: ${session.id} for org: ${organizationId}`,
    );

    // Extract appointment ID from metadata
    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId) {
      console.error("No appointment ID found in session metadata");
      return;
    }

    // Update appointment with payment information
    await db
      .update(appointment)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
        stripeCheckoutSessionId: session.id,
        paymentAmount: session.amount_total,
        paymentCurrency: session.currency,
        notes: `Payment completed. Stripe session: ${session.id}`,
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    console.log(
      `Appointment ${appointmentId} confirmed after payment for org: ${organizationId}`,
    );

    // Create meeting link NOW that payment is confirmed
    await createMeetingLinkForPaidAppointment(appointmentId, organizationId);

    // TODO: Send confirmation email to patient
    // TODO: Send notification to organization
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
  }
}

// Handle expired checkout session
async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  organizationId: string,
) {
  try {
    console.log(
      `Checkout session expired: ${session.id} for org: ${organizationId}`,
    );

    // Extract appointment ID from metadata
    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId) {
      console.error("No appointment ID found in expired session metadata");
      return;
    }

    // Update appointment status to failed_payment (user cancelled/abandoned)
    await db
      .update(appointment)
      .set({
        status: "failed_payment",
        paymentStatus: "failed",
        stripeCheckoutSessionId: session.id,
        notes: `Checkout session expired/cancelled. Stripe session: ${session.id}`,
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    console.log(
      `Appointment ${appointmentId} marked as failed payment due to expired/cancelled session for org: ${organizationId}`,
    );

    // Send retry email to patient
    await sendPaymentRetryEmail(appointmentId, organizationId);
  } catch (error) {
    console.error("Error handling checkout session expired:", error);
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  organizationId: string,
) {
  try {
    console.log(
      `Payment intent succeeded: ${paymentIntent.id} for org: ${organizationId}`,
    );

    const appointmentId = paymentIntent.metadata?.appointmentId;
    if (!appointmentId) {
      console.error("No appointment ID found in payment intent metadata");
      return;
    }

    // Update appointment with payment information
    await db
      .update(appointment)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
        stripePaymentIntentId: paymentIntent.id,
        paymentAmount: paymentIntent.amount,
        paymentCurrency: paymentIntent.currency,
        notes: `Payment succeeded. Stripe payment intent: ${paymentIntent.id}`,
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    console.log(
      `Appointment ${appointmentId} confirmed after payment intent succeeded for org: ${organizationId}`,
    );

    // Create meeting link NOW that payment is confirmed
    await createMeetingLinkForPaidAppointment(appointmentId, organizationId);
  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  organizationId: string,
) {
  try {
    console.log(
      `Payment intent failed: ${paymentIntent.id} for org: ${organizationId}`,
    );

    const appointmentId = paymentIntent.metadata?.appointmentId;
    if (!appointmentId) {
      console.error("No appointment ID found in payment intent metadata");
      return;
    }

    // Update appointment status to failed_payment
    await db
      .update(appointment)
      .set({
        status: "failed_payment",
        paymentStatus: "failed",
        stripePaymentIntentId: paymentIntent.id,
        notes: `Payment failed. Stripe payment intent: ${paymentIntent.id}`,
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    console.log(
      `Appointment ${appointmentId} marked as payment failed for org: ${organizationId}`,
    );

    // Send retry payment email to patient
    await sendPaymentRetryEmail(appointmentId, organizationId);
  } catch (error) {
    console.error("Error handling payment intent failed:", error);
  }
}

// Handle successful invoice payment (subscriptions)
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  organizationId: string,
) {
  try {
    console.log(
      `Invoice payment succeeded: ${invoice.id} for org: ${organizationId}`,
    );

    // For subscription-based appointments, this confirms recurring payment
    const appointmentId = invoice.metadata?.appointmentId;
    if (appointmentId) {
      // Extract subscription ID - it can be a string or Subscription object
      // Using type assertion since Stripe's TypeScript definitions may not include all properties
      let subscriptionId: string | null = null;
      const invoiceWithSubscription = invoice as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription;
      };

      if (invoiceWithSubscription.subscription) {
        subscriptionId =
          typeof invoiceWithSubscription.subscription === "string"
            ? invoiceWithSubscription.subscription
            : invoiceWithSubscription.subscription.id;
      }

      await db
        .update(appointment)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          stripeSubscriptionId: subscriptionId,
          notes: `Subscription payment succeeded. Invoice: ${invoice.id}`,
          updatedAt: new Date(),
        })
        .where(eq(appointment.id, appointmentId));
    }

    // TODO: Handle subscription billing cycles
    // TODO: Update subscription status in database
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
  }
}

// Handle failed invoice payment (subscriptions)
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  organizationId: string,
) {
  try {
    console.log(
      `Invoice payment failed: ${invoice.id} for org: ${organizationId}`,
    );

    const appointmentId = invoice.metadata?.appointmentId;
    if (appointmentId) {
      await db
        .update(appointment)
        .set({
          status: "failed_payment",
          paymentStatus: "failed",
          notes: `Subscription payment failed. Invoice: ${invoice.id}`,
          updatedAt: new Date(),
        })
        .where(eq(appointment.id, appointmentId));
    }

    // Send retry payment email for failed subscription payments
    if (appointmentId) {
      await sendPaymentRetryEmail(appointmentId, organizationId);
    }
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}

// Handle subscription created
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  organizationId: string,
) {
  try {
    console.log(
      `Subscription created: ${subscription.id} for org: ${organizationId}`,
    );

    // TODO: Store subscription information
    // TODO: Link subscription to customer/appointments
    // TODO: Set up recurring appointment scheduling if applicable
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  organizationId: string,
) {
  try {
    console.log(
      `Subscription updated: ${subscription.id} for org: ${organizationId}`,
    );

    // TODO: Update subscription information
    // TODO: Handle plan changes, quantity changes, etc.
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  organizationId: string,
) {
  try {
    console.log(
      `Subscription deleted: ${subscription.id} for org: ${organizationId}`,
    );

    // TODO: Handle subscription cancellation
    // TODO: Update appointment statuses if needed
    // TODO: Notify organization about cancellation
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}

// GET method to verify webhook endpoint is working
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;

  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    organizationId: orgId,
    timestamp: new Date().toISOString(),
  });
}

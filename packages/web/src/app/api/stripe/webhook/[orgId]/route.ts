import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@acme/shared/server";
import { organization, appointment } from "@acme/shared/server";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const body = await req.text();
    const signature = (await headers()).get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json(
        { error: "No Stripe signature found" },
        { status: 400 },
      );
    }

    if (!orgId) {
      console.error("No organization ID provided in webhook URL");
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

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

    // Initialize Stripe with organization's secret key
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Verify webhook signature with organization's webhook secret
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        org.stripeWebhookSecret,
      );
    } catch (error) {
      console.error(
        `Webhook signature verification failed for org ${orgId}:`,
        error,
      );
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    console.log(
      `Processing webhook event: ${event.type} for organization: ${orgId}`,
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          orgId,
        );
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          orgId,
        );
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          orgId,
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          orgId,
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          orgId,
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
          orgId,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          orgId,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          orgId,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type} for org: ${orgId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
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

    // TODO: Send confirmation email to patient
    // TODO: Send notification to organization
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
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

    // Update appointment status to payment_failed
    await db
      .update(appointment)
      .set({
        status: "payment_failed",
        paymentStatus: "failed",
        stripePaymentIntentId: paymentIntent.id,
        notes: `Payment failed. Stripe payment intent: ${paymentIntent.id}`,
        updatedAt: new Date(),
      })
      .where(eq(appointment.id, appointmentId));

    console.log(
      `Appointment ${appointmentId} marked as payment failed for org: ${organizationId}`,
    );

    // TODO: Send payment failure notification
    // TODO: Optionally cancel the appointment or allow retry
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
      await db
        .update(appointment)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          stripeSubscriptionId: invoice.subscription as string,
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
          status: "payment_failed",
          paymentStatus: "failed",
          notes: `Subscription payment failed. Invoice: ${invoice.id}`,
          updatedAt: new Date(),
        })
        .where(eq(appointment.id, appointmentId));
    }

    // TODO: Handle subscription payment failures
    // TODO: Notify organization about failed payments
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

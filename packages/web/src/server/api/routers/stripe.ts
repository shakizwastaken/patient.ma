import { z } from "zod";
import Stripe from "stripe";
import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";
import { organization } from "@acme/shared/server";
import { eq } from "drizzle-orm";

export const stripeRouter = createTRPCRouter({
  // Get Stripe products for the current organization
  getProducts: organizationProcedure.query(async ({ ctx }) => {
    // Get organization Stripe configuration
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    if (!org?.stripeSecretKey || !org.stripeEnabled) {
      throw new Error("Stripe not configured for this organization");
    }

    // Initialize Stripe with organization's secret key
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    try {
      // Fetch products from Stripe
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });

      // Format products for frontend
      const formattedProducts = products.data.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        created: product.created,
        metadata: product.metadata,
      }));

      return { products: formattedProducts };
    } catch (error) {
      console.error("Error fetching Stripe products:", error);
      throw new Error("Failed to fetch Stripe products");
    }
  }),

  // Get Stripe prices for a specific product
  getPrices: organizationProcedure
    .input(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get organization Stripe configuration
      const [org] = await ctx.db
        .select()
        .from(organization)
        .where(eq(organization.id, ctx.organization.id))
        .limit(1);

      if (!org?.stripeSecretKey || !org.stripeEnabled) {
        throw new Error("Stripe not configured for this organization");
      }

      // Initialize Stripe with organization's secret key
      const stripe = new Stripe(org.stripeSecretKey, {
        apiVersion: "2025-08-27.basil",
      });

      try {
        // Fetch prices for the specific product
        const prices = await stripe.prices.list({
          product: input.productId,
          active: true,
          limit: 100,
        });

        // Format prices for frontend
        const formattedPrices = prices.data.map((price) => ({
          id: price.id,
          nickname: price.nickname,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          type: price.type,
          active: price.active,
          created: price.created,
          metadata: price.metadata,
        }));

        return { prices: formattedPrices };
      } catch (error) {
        console.error("Error fetching Stripe prices:", error);
        throw new Error("Failed to fetch Stripe prices");
      }
    }),

  // Check if Stripe is properly configured for the organization
  checkConfiguration: organizationProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    const isConfigured = !!(
      org?.stripeEnabled &&
      org?.stripePublishableKey &&
      org?.stripeSecretKey
    );

    return {
      isConfigured,
      hasPublishableKey: !!org?.stripePublishableKey,
      hasSecretKey: !!org?.stripeSecretKey,
      isEnabled: !!org?.stripeEnabled,
      hasWebhookSecret: !!org?.stripeWebhookSecret,
    };
  }),

  // Automatically create webhook endpoint and get secret
  setupWebhook: organizationProcedure.mutation(async ({ ctx }) => {
    // Get organization Stripe configuration
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    if (!org?.stripeSecretKey || !org.stripeEnabled) {
      throw new Error("Stripe not configured for this organization");
    }

    // Initialize Stripe with organization's secret key
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    try {
      // Get the webhook URL for this organization
      const webhookUrl = `${process.env.BETTER_AUTH_URL}/api/stripe/webhook/${ctx.organization.id}`;

      // Check if webhook already exists
      const existingWebhooks = await stripe.webhookEndpoints.list({
        limit: 100,
      });

      const existingWebhook = existingWebhooks.data.find(
        (webhook) => webhook.url === webhookUrl,
      );

      let webhookEndpoint;
      if (existingWebhook) {
        // Use existing webhook
        webhookEndpoint = existingWebhook;
        console.log(`Using existing webhook endpoint: ${existingWebhook.id}`);
      } else {
        // Create new webhook endpoint
        webhookEndpoint = await stripe.webhookEndpoints.create({
          url: webhookUrl,
          enabled_events: [
            "checkout.session.completed",
            "payment_intent.succeeded",
            "payment_intent.payment_failed",
            "invoice.payment_succeeded",
            "invoice.payment_failed",
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
          ],
          description: `Webhook for organization: ${org.name || ctx.organization.id}`,
        });
        console.log(`Created new webhook endpoint: ${webhookEndpoint.id}`);
      }

      // Update organization with webhook secret
      await ctx.db
        .update(organization)
        .set({
          stripeWebhookSecret: webhookEndpoint.secret,
        })
        .where(eq(organization.id, ctx.organization.id));

      return {
        webhookId: webhookEndpoint.id,
        webhookUrl: webhookEndpoint.url,
        webhookSecret: webhookEndpoint.secret,
        isNewWebhook: !existingWebhook,
      };
    } catch (error) {
      console.error("Error setting up Stripe webhook:", error);
      throw new Error("Failed to setup Stripe webhook");
    }
  }),

  // Remove webhook endpoint from Stripe
  removeWebhook: organizationProcedure.mutation(async ({ ctx }) => {
    // Get organization Stripe configuration
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    if (!org?.stripeSecretKey) {
      throw new Error("Stripe not configured for this organization");
    }

    // Initialize Stripe with organization's secret key
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    try {
      const webhookUrl = `${process.env.BETTER_AUTH_URL}/api/stripe/webhook/${ctx.organization.id}`;

      // Find and delete the webhook
      const existingWebhooks = await stripe.webhookEndpoints.list({
        limit: 100,
      });

      const existingWebhook = existingWebhooks.data.find(
        (webhook) => webhook.url === webhookUrl,
      );

      if (existingWebhook) {
        await stripe.webhookEndpoints.del(existingWebhook.id);
        console.log(`Deleted webhook endpoint: ${existingWebhook.id}`);
      }

      // Clear webhook secret from database
      await ctx.db
        .update(organization)
        .set({
          stripeWebhookSecret: null,
        })
        .where(eq(organization.id, ctx.organization.id));

      return { success: true };
    } catch (error) {
      console.error("Error removing Stripe webhook:", error);
      throw new Error("Failed to remove Stripe webhook");
    }
  }),
});

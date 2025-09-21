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
    };
  }),
});

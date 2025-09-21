import { api } from "@/trpc/react";

export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created: number;
  metadata: Record<string, string>;
}

export interface StripePrice {
  id: string;
  nickname?: string;
  unit_amount?: number;
  currency: string;
  recurring?: {
    interval: string;
    interval_count: number;
  } | null;
  type: "one_time" | "recurring";
  active: boolean;
  created: number;
  metadata: Record<string, string>;
}

// Hook to get Stripe products using tRPC
export function useStripeProducts() {
  const query = api.stripe.getProducts.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    products: query.data?.products || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// Hook to get Stripe prices for a specific product using tRPC
export function useStripePrices(productId?: string) {
  const query = api.stripe.getPrices.useQuery(
    { productId: productId! },
    {
      enabled: !!productId,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  return {
    prices: query.data?.prices || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// Hook to check Stripe configuration
export function useStripeConfiguration() {
  const query = api.stripe.checkConfiguration.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    isConfigured: query.data?.isConfigured || false,
    hasPublishableKey: query.data?.hasPublishableKey || false,
    hasSecretKey: query.data?.hasSecretKey || false,
    isEnabled: query.data?.isEnabled || false,
    loading: query.isLoading,
    error: query.error?.message || null,
  };
}

// Helper function to format price display
export function formatStripePrice(price: StripePrice): string {
  if (!price.unit_amount) return "Free";

  const amount = price.unit_amount / 100;
  const currency = price.currency.toUpperCase();

  let formatted = `${amount.toFixed(2)} ${currency}`;

  if (price.recurring) {
    const interval = price.recurring.interval;
    const intervalCount = price.recurring.interval_count;

    if (intervalCount === 1) {
      formatted += ` / ${interval}`;
    } else {
      formatted += ` / ${intervalCount} ${interval}s`;
    }
  }

  return formatted;
}

// Helper function to get payment type from price
export function getPriceType(price: StripePrice): "one_time" | "subscription" {
  return price.recurring ? "subscription" : "one_time";
}

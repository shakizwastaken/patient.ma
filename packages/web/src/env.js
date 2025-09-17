import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string().url(),

    // Cross-subdomain authentication settings
    AUTH_DOMAIN: z.string().optional(), // e.g., "example.com" for cross-subdomain cookies
    AUTH_TRUSTED_ORIGINS: z.string().optional(), // Comma-separated list of trusted origins

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    RESEND_API_KEY: z.string(),

    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_PUBLISHABLE_KEY: z.string(),
  },

  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default("My App"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,

    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,

    // Cross-subdomain authentication settings
    AUTH_DOMAIN: process.env.AUTH_DOMAIN,
    AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    RESEND_API_KEY: process.env.RESEND_API_KEY,

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,
});

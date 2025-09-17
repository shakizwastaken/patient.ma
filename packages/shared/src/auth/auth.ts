import { config } from "dotenv";
config();

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { db } from "../db";
import { emailService } from "../lib/email";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // Cross-subdomain authentication configuration
  advanced: {
    cookiePrefix: "acme-auth",
    crossSubDomainCookies: {
      enabled: !!process.env.AUTH_DOMAIN,
      domain: process.env.AUTH_DOMAIN,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // Trusted origins for cross-subdomain authentication
  trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS
    ? process.env.AUTH_TRUSTED_ORIGINS.split(",").map((origin) => origin.trim())
    : undefined,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await emailService.sendPasswordReset({
        to: user.email,
        firstName: user.name || "User",
        resetLink: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailService.sendEmailVerification({
        to: user.email,
        firstName: user.name || "User",
        verificationLink: url,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Send welcome email when user creates account
          try {
            await emailService.sendWelcomeEmail({
              to: user.email,
              firstName: user.name || "User",
            });
          } catch (error) {
            console.error("Failed to send welcome email:", error);
          }
        },
      },
    },
  },
  plugins: [
    admin(),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      membershipLimit: 100,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        await emailService.sendOrganizationInvitation({
          to: data.email,
          invitedByName: data.inviter.user.name || "Team Member",
          invitedByEmail: data.inviter.user.email,
          organizationName: data.organization.name,
          role: Array.isArray(data.role) ? data.role.join(", ") : data.role,
          inviteLink,
        });
      },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        // Get plans dynamically from database
        plans: async () => {
          try {
            const dbPlans = await db.query.plan.findMany({
              where: (plan, { eq, and }) =>
                and(eq(plan.isActive, true), eq(plan.type, "subscription")),
              orderBy: (plan, { asc }) => asc(plan.sortOrder),
            });

            return dbPlans.map((plan) => ({
              name: plan.name,
              priceId: plan.stripePriceId,
              annualDiscountPriceId: plan.stripeAnnualPriceId || undefined,
              limits: plan.limits ? JSON.parse(plan.limits) : {},
              freeTrial: plan.trialPeriodDays
                ? {
                    days: plan.trialPeriodDays,
                  }
                : undefined,
            }));
          } catch (error) {
            console.error("Failed to load plans from database:", error);
            // Fallback to hardcoded plans if database fails
            return [
              {
                name: "starter",
                priceId: "price_starter_monthly",
                limits: {
                  projects: 5,
                  storage: 10,
                  members: 3,
                  apiCalls: 10000,
                },
                freeTrial: { days: 14 },
              },
            ];
          }
        },
      },

      // Associate subscriptions with organizations instead of users
      authorizeReference: async ({
        user,
        referenceId,
        action,
      }: {
        user: any;
        referenceId: any;
        action: any;
      }) => {
        // Check if user has permission to manage subscriptions for this organization
        const member = await db.query.member.findFirst({
          where: (member, { eq, and }) =>
            and(
              eq(member.userId, user.id),
              eq(member.organizationId, referenceId),
            ),
        });

        return member?.role === "owner" || member?.role === "admin";
      },
      onCustomerCreate: async ({
        stripeCustomer,
        user,
      }: {
        stripeCustomer: any;
        user: any;
      }) => {
        console.log(
          `✅ Stripe customer ${stripeCustomer.id} created for user ${user.id}`,
        );
      },
      onSubscriptionCreate: async ({
        subscription,
        user,
      }: {
        subscription: any;
        user: any;
      }) => {
        console.log(
          `✅ Subscription ${subscription.id} created for user ${user.id}`,
        );
      },
      onSubscriptionUpdate: async ({
        subscription,
        user,
      }: {
        subscription: any;
        user: any;
      }) => {
        console.log(
          `🔄 Subscription ${subscription.id} updated for user ${user.id}`,
        );
      },
      onSubscriptionCancel: async ({
        subscription,
        user,
      }: {
        subscription: any;
        user: any;
      }) => {
        console.log(
          `❌ Subscription ${subscription.id} canceled for user ${user.id}`,
        );
      },
    }),
  ],
});

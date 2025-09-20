import { config } from "dotenv";
config();

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { db } from "../db";
import { emailService } from "../lib/email";
import { organizationAppointmentType } from "../db/schema";

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
    organization: {
      create: {
        after: async (organization: any) => {
          // Create default appointment types for new organization
          try {
            const DEFAULT_APPOINTMENT_TYPES = [
              {
                name: "Consultation initiale",
                description:
                  "Première rencontre avec un nouveau patient, collecte des antécédents médicaux, diagnostic préliminaire.",
                defaultDurationMinutes: 45,
                color: "#3b82f6",
                organizationId: organization.id,
              },
              {
                name: "Consultation de suivi",
                description:
                  "Contrôle après un traitement ou une première consultation.",
                defaultDurationMinutes: 30,
                color: "#10b981",
                organizationId: organization.id,
              },
              {
                name: "Consultation de routine",
                description:
                  "Examens de santé réguliers, dépistage, vaccination.",
                defaultDurationMinutes: 30,
                color: "#8b5cf6",
                organizationId: organization.id,
              },
              {
                name: "Consultation spécialisée",
                description:
                  "Rendez-vous avec un spécialiste (cardiologue, dermatologue, etc.).",
                defaultDurationMinutes: 60,
                color: "#f59e0b",
                organizationId: organization.id,
              },
              {
                name: "Urgence",
                description: "Consultation rapide pour un problème aigu.",
                defaultDurationMinutes: 20,
                color: "#ef4444",
                organizationId: organization.id,
              },
              {
                name: "Téléconsultation",
                description: "Rendez-vous vidéo ou téléphone.",
                defaultDurationMinutes: 30,
                color: "#06b6d4",
                organizationId: organization.id,
              },
              {
                name: "Bilan / Examen complémentaire",
                description: "Analyses, imagerie médicale, tests spécifiques.",
                defaultDurationMinutes: 60,
                color: "#84cc16",
                organizationId: organization.id,
              },
              {
                name: "Consultation administrative",
                description:
                  "Renouvellement d'ordonnance, certificat médical, résultats d'analyses.",
                defaultDurationMinutes: 15,
                color: "#6b7280",
                organizationId: organization.id,
              },
            ];

            await db
              .insert(organizationAppointmentType)
              .values(DEFAULT_APPOINTMENT_TYPES);
          } catch (error) {
            console.error("Failed to create default appointment types:", error);
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

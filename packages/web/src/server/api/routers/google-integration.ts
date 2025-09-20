import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { google } from "googleapis";
import { organization } from "@acme/shared/server";
import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BETTER_AUTH_URL}/api/google/callback`,
);

export const googleIntegrationRouter = createTRPCRouter({
  // Get Google OAuth URL for integration
  getAuthUrl: organizationProcedure.query(async ({ ctx }) => {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: ctx.organization.id, // Pass org ID to identify which org is integrating
      prompt: "consent", // Force consent screen to get refresh token
    });

    return { authUrl };
  }),

  // Check if Google integration is enabled
  getIntegrationStatus: organizationProcedure.query(async ({ ctx }) => {
    const org = await ctx.db
      .select({
        googleIntegrationEnabled: organization.googleIntegrationEnabled,
        googleAccessToken: organization.googleAccessToken,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    return {
      isIntegrated: org[0]?.googleIntegrationEnabled || false,
      hasToken: !!org[0]?.googleAccessToken,
    };
  }),

  // Disable Google integration
  disableIntegration: organizationProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(organization)
      .set({
        googleIntegrationEnabled: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        googleCalendarId: null,
      })
      .where(eq(organization.id, ctx.organization.id));

    return { success: true, message: "Google integration disabled" };
  }),

  // Get stored Google tokens for creating meetings (internal use)
  getTokens: organizationProcedure.query(async ({ ctx }) => {
    const org = await ctx.db
      .select({
        googleAccessToken: organization.googleAccessToken,
        googleRefreshToken: organization.googleRefreshToken,
        googleTokenExpiresAt: organization.googleTokenExpiresAt,
        googleCalendarId: organization.googleCalendarId,
        googleIntegrationEnabled: organization.googleIntegrationEnabled,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    if (!org[0]?.googleIntegrationEnabled || !org[0]?.googleAccessToken) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Google integration not enabled or no access token available",
      });
    }

    return org[0];
  }),
});

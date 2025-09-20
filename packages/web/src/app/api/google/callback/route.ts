import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@acme/shared/server";
import { organization } from "@acme/shared/server";
import { eq } from "drizzle-orm";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BETTER_AUTH_URL}/api/google/callback`,
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the organization ID
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/organization/settings?error=google_auth_failed`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/organization/settings?error=missing_parameters`, request.url),
    );
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Store tokens in database first
    await db
      .update(organization)
      .set({
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        googleCalendarId: "primary", // Default to primary calendar
        googleIntegrationEnabled: true,
      })
      .where(eq(organization.id, state));

    // Try to verify calendar access (optional - don't fail if API not enabled yet)
    try {
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const calendarInfo = await calendar.calendars.get({
        calendarId: "primary",
      });

      // Update with actual calendar ID if successful
      await db
        .update(organization)
        .set({
          googleCalendarId: calendarInfo.data.id,
        })
        .where(eq(organization.id, state));
    } catch (calendarError: any) {
      console.warn(
        "Calendar API verification failed (this is OK if API not enabled yet):",
        calendarError.message,
      );
      // Don't fail the integration - tokens are stored, API just needs to be enabled
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/organization/settings?success=google_integrated`, request.url),
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/organization/settings?error=integration_failed`, request.url),
    );
  }
}

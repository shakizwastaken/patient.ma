import { google } from "googleapis";

export interface CreateMeetingEventData {
  summary: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendeeEmails: string[];
  organizerEmail?: string;
}

export interface TokenRefreshCallback {
  (newAccessToken: string, expiryDate?: Date): Promise<void>;
}

export interface MeetingEventResult {
  meetingLink: string | null;
  eventId: string;
  calendarEventLink: string;
}

export class GoogleCalendarService {
  private calendar: any;
  private auth: any;
  private onTokenRefresh?: TokenRefreshCallback;

  constructor(
    accessToken: string,
    refreshToken?: string,
    onTokenRefresh?: TokenRefreshCallback,
  ) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BETTER_AUTH_URL}/api/google/callback`,
    );

    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.onTokenRefresh = onTokenRefresh;
    this.calendar = google.calendar({ version: "v3", auth: this.auth });
  }

  private async ensureValidToken(): Promise<void> {
    try {
      // Check if access token exists and is not expired
      const credentials = this.auth.credentials;

      if (!credentials.access_token) {
        throw new Error("No access token available");
      }

      // If expiry_date exists and token is expired, refresh it
      if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
        console.log("🔄 Access token expired, refreshing...");

        if (this.auth.credentials.refresh_token) {
          const newAccessToken = await this.refreshAccessToken();

          // Update the database with the new token if callback provided
          if (this.onTokenRefresh) {
            const expiryDate = this.auth.credentials.expiry_date
              ? new Date(this.auth.credentials.expiry_date)
              : undefined;
            await this.onTokenRefresh(newAccessToken, expiryDate);
          }

          console.log("✅ Token refreshed and database updated");
        } else {
          console.error("❌ No refresh token available");
          throw new Error("GOOGLE_TOKEN_EXPIRED");
        }
      } else {
        console.log("✅ Access token appears valid (not expired)");
      }
    } catch (error: any) {
      if (error.message === "GOOGLE_TOKEN_EXPIRED") 
        throw error;
      

      console.error("❌ Error checking token validity:", error);
      throw new Error("GOOGLE_TOKEN_EXPIRED");
    }
  }

  async createMeetingEvent(
    eventData: CreateMeetingEventData,
  ): Promise<MeetingEventResult> {
    try {
      console.log("📅 Creating calendar event");
      console.log("👥 Attendees:", eventData.attendeeEmails);

      // Create a rich description for the calendar event
      const eventDescription = [
        eventData.description,
        "",
        "📅 Rendez-vous médical",
        "🎥 Réunion en ligne via Google Meet",
        "",
        "Le lien de la réunion sera automatiquement disponible dans cet événement.",
      ]
        .filter(Boolean)
        .join("\n");

      const event = {
        summary: eventData.summary,
        description: eventDescription,
        start: {
          dateTime: eventData.startTime,
          timeZone: "Africa/Casablanca", // Default timezone
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: "Africa/Casablanca",
        },
        attendees: eventData.attendeeEmails.map((email) => ({
          email,
          responseStatus: "needsAction",
        })),
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24 hours before
            { method: "popup", minutes: 30 }, // 30 minutes before
          ],
        },
        // Ensure calendar invites are sent
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
      };

      console.log("📤 Inserting calendar event with invites...");
      console.log("🔑 Using auth credentials:", {
        hasAccessToken: !!this.auth.credentials.access_token,
        hasRefreshToken: !!this.auth.credentials.refresh_token,
        tokenExpiry: this.auth.credentials.expiry_date,
      });

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: "all", // Send email invitations to all attendees
      });

      console.log(
        "📬 Calendar event created successfully - invites sent to all attendees",
      );

      return {
        meetingLink: response.data.hangoutLink || null,
        eventId: response.data.id,
        calendarEventLink: response.data.htmlLink || "",
      };
    } catch (error: any) {
      console.error("Error creating Google Calendar event:", error);

      // Handle token refresh if access token expired
      if (error.code === 401 || error.message?.includes("invalid_grant")) {
        throw new Error("GOOGLE_TOKEN_EXPIRED");
      }

      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  async updateMeetingEvent(
    eventId: string,
    eventData: Partial<CreateMeetingEventData>,
  ): Promise<MeetingEventResult> {
    try {
      const updateData: any = {};

      if (eventData.summary) updateData.summary = eventData.summary;
      if (eventData.description) updateData.description = eventData.description;
      if (eventData.startTime) {
        updateData.start = {
          dateTime: eventData.startTime,
          timeZone: "Africa/Casablanca",
        };
      }
      if (eventData.endTime) {
        updateData.end = {
          dateTime: eventData.endTime,
          timeZone: "Africa/Casablanca",
        };
      }
      if (eventData.attendeeEmails) {
        updateData.attendees = eventData.attendeeEmails.map((email) => ({
          email,
        }));
      }

      const response = await this.calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        resource: updateData,
        sendUpdates: "all",
      });

      return {
        meetingLink: response.data.hangoutLink || null,
        eventId: response.data.id,
        calendarEventLink: response.data.htmlLink || "",
      };
    } catch (error: any) {
      console.error("Error updating Google Calendar event:", error);

      if (error.code === 401 || error.message?.includes("invalid_grant")) {
        throw new Error("GOOGLE_TOKEN_EXPIRED");
      }

      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  async deleteMeetingEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all",
      });
    } catch (error: any) {
      console.error("Error deleting Google Calendar event:", error);

      if (error.code === 401 || error.message?.includes("invalid_grant")) {
        throw new Error("GOOGLE_TOKEN_EXPIRED");
      }

      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  async refreshAccessToken(): Promise<string> {
    try {
      console.log("🔄 Refreshing Google access token...");
      const { credentials } = await this.auth.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error("No access token received from refresh");
      }

      // Update the auth client with the new credentials
      this.auth.setCredentials(credentials);

      console.log(
        "✅ Successfully refreshed Google access token and updated auth client",
      );
      return credentials.access_token;
    } catch (error: any) {
      console.error("❌ Error refreshing Google access token:", error);
      throw new Error("GOOGLE_TOKEN_EXPIRED");
    }
  }
}

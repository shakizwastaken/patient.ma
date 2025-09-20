import { google } from "googleapis";

export interface CreateMeetingEventData {
  summary: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendeeEmails: string[];
  organizerEmail?: string;
}

export interface MeetingEventResult {
  meetingLink: string | null;
  eventId: string;
  calendarEventLink: string;
}

export class GoogleCalendarService {
  private calendar: any;
  private auth: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BETTER_AUTH_URL}/api/google/callback`,
    );

    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: "v3", auth: this.auth });
  }

  async createMeetingEvent(
    eventData: CreateMeetingEventData,
  ): Promise<MeetingEventResult> {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: "Africa/Casablanca", // Default timezone
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: "Africa/Casablanca",
        },
        attendees: eventData.attendeeEmails.map((email) => ({ email })),
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
      };

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: "all", // Send email invitations to attendees
      });

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
      const { credentials } = await this.auth.refreshAccessToken();
      return credentials.access_token;
    } catch (error: any) {
      console.error("Error refreshing Google access token:", error);
      throw new Error("Failed to refresh Google access token");
    }
  }
}

import { z } from "zod";
import { eq, and, gte, lte, desc, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  appointment,
  patient,
  patientOrganization,
  organizationAvailability,
  organizationScheduleOverride,
  organizationAppointmentType,
  organization,
  organizationAppointmentConfig,
  member,
  user,
} from "@acme/shared/server";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { GoogleCalendarService, emailService } from "@acme/shared/server";
import { addMinutes, addDays, format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import Stripe from "stripe";

// Helper function to get organization owners and admins
async function getOrganizationOwners(db: any, organizationId: string) {
  try {
    const owners = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, organizationId),
          or(eq(member.role, "owner"), eq(member.role, "admin")),
        ),
      );

    return owners;
  } catch (error) {
    console.error("Error fetching organization owners:", error);
    return [];
  }
}

// Helper function to send appointment notifications to organization owners
async function sendAppointmentNotificationToOwners(
  db: any,
  organizationId: string,
  organizationName: string,
  organizationLogo: string | null,
  appointmentData: {
    patientName: string;
    patientEmail: string;
    patientPhoneNumber?: string;
    appointmentTitle: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    duration: number;
    meetingLink?: string;
    notes?: string;
    isPaidAppointment: boolean;
    paymentStatus?: string;
  },
) {
  try {
    const owners = await getOrganizationOwners(db, organizationId);

    if (owners.length === 0) {
      console.log("No organization owners found to notify");
      return;
    }

    // Send notification to each owner/admin
    const notificationPromises = owners.map(
      async (owner: {
        id: string;
        name: string | null;
        email: string;
        role: string;
      }) => {
        try {
          const emailResult = await emailService.sendNewAppointmentNotification(
            {
              to: owner.email,
              ownerName: owner.name || "Administrateur",
              organizationName,
              organizationLogo: organizationLogo || undefined,
              patientName: appointmentData.patientName,
              patientEmail: appointmentData.patientEmail,
              patientPhoneNumber: appointmentData.patientPhoneNumber,
              appointmentTitle: appointmentData.appointmentTitle,
              appointmentDate: appointmentData.appointmentDate,
              appointmentTime: appointmentData.appointmentTime,
              appointmentType: appointmentData.appointmentType,
              duration: appointmentData.duration,
              meetingLink: appointmentData.meetingLink,
              notes: appointmentData.notes,
              isPaidAppointment: appointmentData.isPaidAppointment,
              paymentStatus: appointmentData.paymentStatus,
            },
          );

          if (emailResult.error) {
            console.error(
              `Failed to send notification to ${owner.email}:`,
              emailResult.error,
            );
          } else {
            console.log(
              `✅ Appointment notification sent to ${owner.email} (${owner.role})`,
            );
          }
        } catch (error) {
          console.error(`Error sending notification to ${owner.email}:`, error);
        }
      },
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error sending appointment notifications to owners:", error);
  }
}

// Helper function to create Stripe checkout session for paid appointments
async function createStripeCheckoutSession(params: {
  organizationId: string;
  appointmentId: string;
  appointmentTypeId: string;
  patientEmail: string;
  patientName: string;
  successUrl: string;
  cancelUrl: string;
  db: any;
}): Promise<{ url: string; sessionId: string } | null> {
  try {
    // Get organization Stripe configuration
    const [org] = await params.db
      .select()
      .from(organization)
      .where(eq(organization.id, params.organizationId))
      .limit(1);

    if (!org?.stripeSecretKey || !org.stripeEnabled) {
      throw new Error("Stripe not configured for this organization");
    }

    // Get appointment type payment configuration
    const [appointmentType] = await params.db
      .select()
      .from(organizationAppointmentType)
      .where(eq(organizationAppointmentType.id, params.appointmentTypeId))
      .limit(1);

    if (!appointmentType?.requiresPayment || !appointmentType.stripePriceId) {
      throw new Error("Invalid payment configuration");
    }

    // Initialize Stripe
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode:
        appointmentType.paymentType === "subscription"
          ? "subscription"
          : "payment",
      customer_email: params.patientEmail,
      line_items: [
        {
          price: appointmentType.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        organizationId: params.organizationId,
        appointmentId: params.appointmentId,
        appointmentTypeId: params.appointmentTypeId,
        patientEmail: params.patientEmail,
        patientName: params.patientName,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return null;
  }
}

// Helper function to create Google Meet link if needed (copied from appointments.ts)
async function createMeetingLinkIfNeeded(
  ctx: any,
  organizationData: any,
  appointmentData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    appointmentTypeId?: string;
  },
  patientEmail?: string,
) {
  try {
    // Check if online conferencing is enabled and if this appointment type requires it
    const config = await ctx.db
      .select()
      .from(organizationAppointmentConfig)
      .where(
        eq(organizationAppointmentConfig.organizationId, organizationData.id),
      )
      .limit(1);

    const appointmentConfig = config[0];

    if (!appointmentConfig?.onlineConferencingEnabled) {
      return { meetingLink: null, meetingId: null };
    }

    // Check if this appointment type is the one configured for online conferencing
    if (
      appointmentData.appointmentTypeId !==
      appointmentConfig.onlineConferencingAppointmentTypeId
    ) {
      return { meetingLink: null, meetingId: null };
    }

    if (
      !organizationData?.googleIntegrationEnabled ||
      !organizationData?.googleAccessToken
    ) {
      console.log("❌ Google integration not properly configured");
      return { meetingLink: null, meetingId: null };
    }

    // Additional validation for Google credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log("❌ Google OAuth credentials not configured in environment");
      return { meetingLink: null, meetingId: null };
    }

    // Create Google Calendar service with token refresh callback
    const calendarService = new GoogleCalendarService(
      organizationData.googleAccessToken,
      organizationData.googleRefreshToken,
      async (newAccessToken: string, expiryDate?: Date) => {
        await ctx.db
          .update(organization)
          .set({
            googleAccessToken: newAccessToken,
            googleTokenExpiresAt: expiryDate,
          })
          .where(eq(organization.id, organizationData.id));
      },
    );

    const attendeeEmails = [];
    if (patientEmail) {
      attendeeEmails.push(patientEmail);
    }

    const meetingResult = await calendarService.createMeetingEvent({
      summary: appointmentData.title,
      description: appointmentData.description,
      startTime: appointmentData.startTime.toISOString(),
      endTime: appointmentData.endTime.toISOString(),
      attendeeEmails,
    });

    return {
      meetingLink: meetingResult.meetingLink,
      meetingId: meetingResult.eventId,
    };
  } catch (error) {
    console.error("Error creating meeting link:", error);
    return { meetingLink: null, meetingId: null };
  }
}

// Helper function to create calendar event for in-person appointments
async function createInPersonCalendarEvent(
  ctx: any,
  organizationData: any,
  appointmentData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    appointmentTypeId?: string;
  },
  patientEmail?: string,
) {
  try {
    console.log("🔍 Creating in-person calendar event for appointment:", {
      appointmentTypeId: appointmentData.appointmentTypeId,
      title: appointmentData.title,
    });

    if (
      !organizationData?.googleIntegrationEnabled ||
      !organizationData?.googleAccessToken
    ) {
      console.log("❌ Google integration not properly configured");
      return { meetingLink: null, meetingId: null };
    }

    // Additional validation for Google credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log("❌ Google OAuth credentials not configured in environment");
      return { meetingLink: null, meetingId: null };
    }

    // Create Google Calendar service with token refresh callback
    const calendarService = new GoogleCalendarService(
      organizationData.googleAccessToken,
      organizationData.googleRefreshToken,
      async (newAccessToken: string, expiryDate?: Date) => {
        // Update the database with the new access token
        await ctx.db
          .update(organization)
          .set({
            googleAccessToken: newAccessToken,
            googleTokenExpiresAt: expiryDate,
          })
          .where(eq(organization.id, organizationData.id));

        console.log("💾 Updated database with new Google access token");
      },
    );

    // Prepare attendee emails (patient only - organizer will be added automatically)
    const attendeeEmails = [];
    if (patientEmail) {
      attendeeEmails.push(patientEmail);
      console.log("👤 Adding patient as attendee:", patientEmail);
    }

    // Use organization address as location if available
    const location = undefined; // Organization address not available in schema

    // Create in-person calendar event
    const eventResult = await calendarService.createInPersonEvent({
      summary: appointmentData.title,
      description: appointmentData.description,
      startTime: appointmentData.startTime.toISOString(),
      endTime: appointmentData.endTime.toISOString(),
      attendeeEmails,
      location,
    });

    console.log("🎉 In-person calendar event created successfully:", {
      eventId: eventResult.eventId,
      calendarEventLink: eventResult.calendarEventLink,
    });

    return {
      meetingLink: null, // No meeting link for in-person events
      meetingId: eventResult.eventId,
    };
  } catch (error) {
    console.error("Error creating in-person calendar event:", error);
    return { meetingLink: null, meetingId: null };
  }
}

// Helper function to generate available time slots
function generateTimeSlots(
  availability: any[],
  existingAppointments: any[],
  date: Date,
  slotDurationMinutes: number,
  bufferTimeMinutes: number,
  timezone: string,
  scheduleOverrides: any[] = [],
  sameDayBookingAllowed: boolean = true,
) {
  const dayOfWeek = date.getDay();
  const dayAvailability = availability.find((av) => av.dayOfWeek === dayOfWeek);

  if (!dayAvailability || !dayAvailability.isAvailable) {
    return [];
  }

  // Check for schedule overrides that affect this date
  const dateOverrides = scheduleOverrides.filter((override) => {
    const overrideStart = new Date(override.startDate);
    const overrideEnd = new Date(override.endDate);
    return date >= overrideStart && date <= overrideEnd;
  });

  // If there's an "unavailable" override for this date, return no slots
  if (dateOverrides.some((override) => override.type === "unavailable")) {
    return [];
  }

  const slots = [];
  const [startHour, startMinute] = dayAvailability.startTime
    .split(":")
    .map(Number);
  const [endHour, endMinute] = dayAvailability.endTime.split(":").map(Number);

  const startTime = new Date(date);
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(endHour, endMinute, 0, 0);

  // For today, ensure we don't show past time slots
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  // If same-day booking is not allowed and it's today, return no slots
  if (isToday && !sameDayBookingAllowed) {
    return [];
  }

  let currentTime = new Date(startTime);

  // If it's today, start from the current time + buffer
  if (isToday) {
    const minimumStartTime = addMinutes(now, bufferTimeMinutes + 15); // 15 min minimum notice
    if (minimumStartTime > currentTime) {
      currentTime = new Date(minimumStartTime);
      // Round up to next slot boundary
      const minutesPastHour = currentTime.getMinutes();
      const slotsPerHour = 60 / slotDurationMinutes;
      const slotSize = 60 / slotsPerHour;
      const nextSlotMinute = Math.ceil(minutesPastHour / slotSize) * slotSize;
      currentTime.setMinutes(nextSlotMinute, 0, 0);
    }
  }

  while (currentTime < endTime) {
    const slotEnd = addMinutes(currentTime, slotDurationMinutes);

    if (slotEnd <= endTime) {
      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        return (
          (currentTime >= aptStart && currentTime < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (currentTime <= aptStart && slotEnd >= aptEnd)
        );
      });

      // Check if slot conflicts with schedule overrides
      const hasOverrideConflict = dateOverrides.some((override) => {
        if (override.type !== "reduced_hours") return false;

        // For reduced hours, check if the slot is within the allowed time
        if (override.startTime && override.endTime) {
          const [overrideStartHour, overrideStartMinute] = override.startTime
            .split(":")
            .map(Number);
          const [overrideEndHour, overrideEndMinute] = override.endTime
            .split(":")
            .map(Number);

          const overrideStart = new Date(date);
          overrideStart.setHours(overrideStartHour, overrideStartMinute, 0, 0);

          const overrideEnd = new Date(date);
          overrideEnd.setHours(overrideEndHour, overrideEndMinute, 0, 0);

          // Slot is NOT available if it's outside the reduced hours
          return currentTime < overrideStart || slotEnd > overrideEnd;
        }
        return false;
      });

      if (!hasConflict && !hasOverrideConflict) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(slotEnd),
          available: true,
        });
      }
    }

    currentTime = addMinutes(
      currentTime,
      slotDurationMinutes + bufferTimeMinutes,
    );
  }

  return slots;
}

const getOrganizationBySlugSchema = z.object({
  slug: z.string(),
});

const getAvailableSlotsSchema = z.object({
  slug: z.string(),
  date: z.string(), // ISO date string
});

const getAvailableDatesSchema = z.object({
  slug: z.string(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
});

const bookAppointmentSchema = z.object({
  slug: z.string(),
  appointmentTypeId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date(),
  patientInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string().optional(),
  }),
  notes: z.string().optional(),
});

export const publicBookingRouter = createTRPCRouter({
  // Get organization details by slug for public booking
  getOrganizationBySlug: publicProcedure
    .input(getOrganizationBySlugSchema)
    .query(async ({ ctx, input }) => {
      const org = await ctx.db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
          description: organization.description,
          timezone: organization.timezone,
          publicBookingEnabled: organization.publicBookingEnabled,
        })
        .from(organization)
        .where(
          and(
            eq(organization.slug, input.slug),
            eq(organization.publicBookingEnabled, true),
          ),
        )
        .limit(1);

      if (!org[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or public booking not enabled",
        });
      }

      // Get appointment types for this organization
      const appointmentTypes = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          and(
            eq(organizationAppointmentType.organizationId, org[0].id),
            eq(organizationAppointmentType.isActive, true),
          ),
        );

      // Get appointment configuration
      const config = await ctx.db
        .select()
        .from(organizationAppointmentConfig)
        .where(eq(organizationAppointmentConfig.organizationId, org[0].id))
        .limit(1);

      return {
        ...org[0],
        title: `Reserver avec ${org[0].name}`,
        appointmentTypes,
        config: config[0] || {
          slotDurationMinutes: 30,
          bufferTimeMinutes: 0,
          advanceBookingDays: 30,
          sameDayBookingAllowed: true,
          onlineConferencingEnabled: false,
        },
      };
    }),

  // Get available dates for public booking
  getAvailableDates: publicProcedure
    .input(getAvailableDatesSchema)
    .query(async ({ ctx, input }) => {
      const org = await ctx.db
        .select({
          id: organization.id,
          timezone: organization.timezone,
          publicBookingEnabled: organization.publicBookingEnabled,
        })
        .from(organization)
        .where(
          and(
            eq(organization.slug, input.slug),
            eq(organization.publicBookingEnabled, true),
          ),
        )
        .limit(1);

      if (!org[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or public booking not enabled",
        });
      }

      // Get appointment configuration for advance booking days
      const config = await ctx.db
        .select()
        .from(organizationAppointmentConfig)
        .where(eq(organizationAppointmentConfig.organizationId, org[0].id))
        .limit(1);

      const appointmentConfig = config[0] || {
        slotDurationMinutes: 30,
        bufferTimeMinutes: 0,
        advanceBookingDays: 30,
        sameDayBookingAllowed: true,
      };

      // Get organization availability
      const availability = await ctx.db
        .select()
        .from(organizationAvailability)
        .where(eq(organizationAvailability.organizationId, org[0].id));

      // Calculate date range
      const today = new Date();
      const startDate = input.startDate ? new Date(input.startDate) : today;
      const endDate = input.endDate
        ? new Date(input.endDate)
        : addDays(today, appointmentConfig.advanceBookingDays);

      const availableDates = [];
      const currentDate = new Date(startDate);

      // Check each date in the range
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dayAvailability = availability.find(
          (av) => av.dayOfWeek === dayOfWeek,
        );

        // Only include dates where the organization has availability
        if (dayAvailability && dayAvailability.isAvailable) {
          // Get existing appointments for this date to check if there are any available slots
          const existingAppointments = await ctx.db
            .select({
              startTime: appointment.startTime,
              endTime: appointment.endTime,
            })
            .from(appointment)
            .where(
              and(
                eq(appointment.organizationId, org[0].id),
                gte(appointment.startTime, startOfDay(currentDate)),
                lte(appointment.startTime, endOfDay(currentDate)),
                eq(appointment.status, "scheduled"),
              ),
            );

          // Get schedule overrides for this date
          const scheduleOverrides = await ctx.db
            .select()
            .from(organizationScheduleOverride)
            .where(
              and(
                eq(organizationScheduleOverride.organizationId, org[0].id),
                lte(organizationScheduleOverride.startDate, currentDate),
                gte(organizationScheduleOverride.endDate, currentDate),
              ),
            );

          // Generate slots for this date to check if any are available
          const slots = generateTimeSlots(
            availability,
            existingAppointments,
            currentDate,
            appointmentConfig.slotDurationMinutes,
            appointmentConfig.bufferTimeMinutes,
            org[0].timezone,
            scheduleOverrides,
            appointmentConfig.sameDayBookingAllowed,
          );

          // Only include the date if there are available slots
          if (slots.length > 0) {
            availableDates.push({
              date: format(currentDate, "yyyy-MM-dd"),
              label: format(currentDate, "EEEE, MMMM d"),
              availableSlots: slots.length,
            });
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        availableDates,
        timezone: org[0].timezone,
      };
    }),

  // Get available time slots for a specific date
  getAvailableSlots: publicProcedure
    .input(getAvailableSlotsSchema)
    .query(async ({ ctx, input }) => {
      const org = await ctx.db
        .select({
          id: organization.id,
          timezone: organization.timezone,
          publicBookingEnabled: organization.publicBookingEnabled,
        })
        .from(organization)
        .where(
          and(
            eq(organization.slug, input.slug),
            eq(organization.publicBookingEnabled, true),
          ),
        )
        .limit(1);

      if (!org[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or public booking not enabled",
        });
      }

      const selectedDate = new Date(input.date);

      // Get organization availability
      const availability = await ctx.db
        .select()
        .from(organizationAvailability)
        .where(eq(organizationAvailability.organizationId, org[0].id));

      // Get existing appointments for the date (both scheduled and confirmed are "taken")
      const existingAppointments = await ctx.db
        .select({
          startTime: appointment.startTime,
          endTime: appointment.endTime,
        })
        .from(appointment)
        .where(
          and(
            eq(appointment.organizationId, org[0].id),
            gte(appointment.startTime, startOfDay(selectedDate)),
            lte(appointment.startTime, endOfDay(selectedDate)),
            // Include both scheduled and confirmed appointments as "taken" slots
            or(
              eq(appointment.status, "scheduled"),
              eq(appointment.status, "confirmed"),
            ),
          ),
        );

      // Get schedule overrides for this date
      const scheduleOverrides = await ctx.db
        .select()
        .from(organizationScheduleOverride)
        .where(
          and(
            eq(organizationScheduleOverride.organizationId, org[0].id),
            lte(organizationScheduleOverride.startDate, selectedDate),
            gte(organizationScheduleOverride.endDate, selectedDate),
          ),
        );

      // Get appointment configuration
      const config = await ctx.db
        .select()
        .from(organizationAppointmentConfig)
        .where(eq(organizationAppointmentConfig.organizationId, org[0].id))
        .limit(1);

      const appointmentConfig = config[0] || {
        slotDurationMinutes: 30,
        bufferTimeMinutes: 0,
        sameDayBookingAllowed: true,
      };

      // Generate available slots
      const slots = generateTimeSlots(
        availability,
        existingAppointments,
        selectedDate,
        appointmentConfig.slotDurationMinutes,
        appointmentConfig.bufferTimeMinutes,
        org[0].timezone,
        scheduleOverrides,
        appointmentConfig.sameDayBookingAllowed,
      );

      return {
        date: input.date,
        slots,
        timezone: org[0].timezone,
      };
    }),

  // Get appointment details for retry payment
  getAppointmentForRetry: publicProcedure
    .input(
      z.object({
        appointmentId: z.string().uuid("ID de rendez-vous invalide"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get appointment with organization and patient details
      const [appointmentDetails] = await ctx.db
        .select({
          id: appointment.id,
          title: appointment.title,
          description: appointment.description,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
          appointmentTypeId: appointment.appointmentTypeId,
          organizationId: appointment.organizationId,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          patientFirstName: patient.firstName,
          patientLastName: patient.lastName,
          patientEmail: patient.email,
          patientPhoneNumber: patient.phoneNumber,
        })
        .from(appointment)
        .leftJoin(organization, eq(appointment.organizationId, organization.id))
        .leftJoin(patient, eq(appointment.patientId, patient.id))
        .where(eq(appointment.id, input.appointmentId))
        .limit(1);

      if (!appointmentDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rendez-vous non trouvé",
        });
      }

      // Allow retry for both failed_payment and scheduled (payment pending) status
      if (
        appointmentDetails.status !== "failed_payment" &&
        appointmentDetails.status !== "scheduled"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce rendez-vous ne nécessite pas de nouveau paiement",
        });
      }

      return appointmentDetails;
    }),

  // Book an appointment (public endpoint)
  bookAppointment: publicProcedure
    .input(bookAppointmentSchema)
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db
        .select()
        .from(organization)
        .where(
          and(
            eq(organization.slug, input.slug),
            eq(organization.publicBookingEnabled, true),
          ),
        )
        .limit(1);

      if (!org[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or public booking not enabled",
        });
      }

      // Check if appointment type exists and is active
      const appointmentType = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          and(
            eq(organizationAppointmentType.id, input.appointmentTypeId),
            eq(organizationAppointmentType.organizationId, org[0].id),
            eq(organizationAppointmentType.isActive, true),
          ),
        )
        .limit(1);

      if (!appointmentType[0]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid appointment type",
        });
      }

      // Check for slot availability (both scheduled and confirmed are "taken")
      const conflictingAppointment = await ctx.db
        .select()
        .from(appointment)
        .where(
          and(
            eq(appointment.organizationId, org[0].id),
            // Include both scheduled and confirmed appointments as "taken" slots
            or(
              eq(appointment.status, "scheduled"),
              eq(appointment.status, "confirmed"),
            ),
            // Check for time conflicts
            lte(appointment.startTime, input.endTime),
            gte(appointment.endTime, input.startTime),
          ),
        )
        .limit(1);

      if (conflictingAppointment[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Time slot is no longer available",
        });
      }

      // Find or create patient
      let existingPatient = await ctx.db
        .select()
        .from(patient)
        .where(eq(patient.email, input.patientInfo.email))
        .limit(1);

      let patientId: string;

      if (existingPatient[0]) {
        patientId = existingPatient[0].id;

        // Update patient info if needed
        await ctx.db
          .update(patient)
          .set({
            firstName: input.patientInfo.firstName,
            lastName: input.patientInfo.lastName,
            phoneNumber: input.patientInfo.phoneNumber,
            updatedAt: new Date(),
          })
          .where(eq(patient.id, patientId));
      } else {
        // Create new patient
        const newPatient = await ctx.db
          .insert(patient)
          .values({
            firstName: input.patientInfo.firstName,
            lastName: input.patientInfo.lastName,
            email: input.patientInfo.email,
            phoneNumber: input.patientInfo.phoneNumber,
          })
          .returning({ id: patient.id });

        patientId = newPatient[0]!.id;

        // Link patient to organization
        await ctx.db.insert(patientOrganization).values({
          patientId,
          organizationId: org[0].id,
        });
      }

      // For public bookings, we don't require a creator user
      // The appointment is created by the patient through the public interface

      // Create appointment title
      const appointmentTitle = `${appointmentType[0].name} - ${input.patientInfo.firstName} ${input.patientInfo.lastName}`;

      // Check if this appointment type requires payment FIRST
      // We'll create meeting links only after payment is confirmed for paid appointments
      if (appointmentType[0].requiresPayment) {
        // For paid appointments, create appointment in "scheduled" status
        // and return Stripe checkout URL
        const newAppointment = await ctx.db
          .insert(appointment)
          .values({
            title: appointmentTitle,
            description: input.notes,
            startTime: input.startTime,
            endTime: input.endTime,
            appointmentTypeId: input.appointmentTypeId,
            patientId,
            organizationId: org[0].id,
            status: "scheduled", // Will be confirmed after payment
            paymentStatus: "pending",
            // DON'T create meeting links for paid appointments until payment is confirmed
            meetingLink: null,
            meetingId: null,
          })
          .returning({ id: appointment.id });

        // Create Stripe checkout session
        const checkoutResult = await createStripeCheckoutSession({
          organizationId: org[0].id,
          appointmentId: newAppointment[0]!.id,
          appointmentTypeId: input.appointmentTypeId,
          patientEmail: input.patientInfo.email,
          patientName: `${input.patientInfo.firstName} ${input.patientInfo.lastName}`,
          successUrl: `${process.env.BETTER_AUTH_URL}/book/${input.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${process.env.BETTER_AUTH_URL}/book/${input.slug}/cancel?appointment_id=${newAppointment[0]!.id}&send_email=true`,
          db: ctx.db,
        });

        if (!checkoutResult) {
          // If checkout creation fails, delete the appointment
          await ctx.db
            .delete(appointment)
            .where(eq(appointment.id, newAppointment[0]!.id));

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create payment checkout",
          });
        }

        // Update appointment with checkout session ID
        await ctx.db
          .update(appointment)
          .set({
            stripeCheckoutSessionId: checkoutResult.sessionId,
          })
          .where(eq(appointment.id, newAppointment[0]!.id));

        // Send notification to organization owners for paid appointment
        try {
          await sendAppointmentNotificationToOwners(
            ctx.db,
            org[0].id,
            org[0].name,
            org[0].logo,
            {
              patientName: `${input.patientInfo.firstName} ${input.patientInfo.lastName}`,
              patientEmail: input.patientInfo.email,
              patientPhoneNumber: input.patientInfo.phoneNumber,
              appointmentTitle,
              appointmentDate: format(input.startTime, "EEEE, MMMM d, yyyy", {
                locale: fr,
              }),
              appointmentTime: `${format(input.startTime, "HH:mm")} - ${format(input.endTime, "HH:mm")}`,
              appointmentType: appointmentType[0].name,
              duration: appointmentType[0].defaultDurationMinutes,
              meetingLink: undefined, // No meeting link until payment is confirmed
              notes: input.notes,
              isPaidAppointment: true,
              paymentStatus: "pending",
            },
          );
        } catch (notificationError) {
          console.error(
            "Failed to send notification to organization owners:",
            notificationError,
          );
          // Don't fail the appointment creation if notification fails
        }

        return {
          success: true,
          appointmentId: newAppointment[0]!.id,
          requiresPayment: true,
          checkoutUrl: checkoutResult.url,
          message: "Redirection vers le paiement...",
        };
      }

      // For free appointments, create calendar event (online or in-person) and confirm immediately
      let meetingData: {
        meetingLink: string | null;
        meetingId: string | null;
      } = { meetingLink: null, meetingId: null };

      try {
        // Check if this is an online appointment type
        const config = await ctx.db
          .select()
          .from(organizationAppointmentConfig)
          .where(eq(organizationAppointmentConfig.organizationId, org[0].id))
          .limit(1);

        const appointmentConfig = config[0];
        const isOnlineAppointment =
          appointmentConfig?.onlineConferencingEnabled &&
          input.appointmentTypeId ===
            appointmentConfig.onlineConferencingAppointmentTypeId;

        if (isOnlineAppointment) {
          console.log("🎥 Creating Google Meet link for online appointment...");
          meetingData = await createMeetingLinkIfNeeded(
            ctx,
            org[0],
            {
              title: appointmentTitle,
              description: input.notes,
              startTime: input.startTime,
              endTime: input.endTime,
              appointmentTypeId: input.appointmentTypeId,
            },
            input.patientInfo.email,
          );

          if (meetingData.meetingLink) {
            console.log(
              "✅ Google Meet link created successfully for online appointment",
            );
            console.log(
              "📧 Google Calendar invitation sent to:",
              input.patientInfo.email,
            );
          } else {
            console.log(
              "ℹ️ No Google Meet link created (Google not configured)",
            );
          }
        } else {
          console.log("📍 Creating in-person calendar event...");
          meetingData = await createInPersonCalendarEvent(
            ctx,
            org[0],
            {
              title: appointmentTitle,
              description: input.notes,
              startTime: input.startTime,
              endTime: input.endTime,
              appointmentTypeId: input.appointmentTypeId,
            },
            input.patientInfo.email,
          );

          if (meetingData.meetingId) {
            console.log("✅ In-person calendar event created successfully");
            console.log(
              "📧 Google Calendar invitation sent to:",
              input.patientInfo.email,
            );
          } else {
            console.log("ℹ️ No calendar event created (Google not configured)");
          }
        }
      } catch (calendarError) {
        console.error("❌ Failed to create calendar event:", calendarError);
        console.log("📧 Will still create appointment without calendar event");
        meetingData = { meetingLink: null, meetingId: null };
      }
      const newAppointment = await ctx.db
        .insert(appointment)
        .values({
          title: appointmentTitle,
          description: input.notes,
          startTime: input.startTime,
          endTime: input.endTime,
          status: "confirmed", // Free appointments are immediately confirmed
          paymentStatus: "not_required", // No payment needed
          type: appointmentType[0].name
            .toLowerCase()
            .replace(/\s+/g, "_") as any,
          appointmentTypeId: input.appointmentTypeId,
          patientId,
          organizationId: org[0].id,
          createdById: null, // No creator for public bookings
          meetingLink: meetingData.meetingLink,
          meetingId: meetingData.meetingId,
        })
        .returning();

      // Send confirmation email
      try {
        console.log(
          "📧 Attempting to send booking confirmation email to:",
          input.patientInfo.email,
        );
        console.log("📧 Email service details:", {
          hasResendKey: !!process.env.RESEND_API_KEY,
          fromEmail: "updates@email.allignia.io",
          organizationName: org[0].name,
        });

        const emailResult = await emailService.sendPublicBookingConfirmation({
          to: input.patientInfo.email,
          patientName: `${input.patientInfo.firstName} ${input.patientInfo.lastName}`,
          organizationName: org[0].name,
          organizationLogo: org[0].logo || undefined,
          organizationDescription: org[0].description || undefined,
          appointmentType: appointmentType[0].name,
          appointmentDate: format(input.startTime, "EEEE, MMMM d, yyyy", {
            locale: fr,
          }),
          appointmentTime: `${format(input.startTime, "HH:mm")} - ${format(input.endTime, "HH:mm")}`,
          duration: appointmentType[0].defaultDurationMinutes,
          meetingLink: meetingData.meetingLink || undefined,
          notes: input.notes || undefined,
        });

        console.log(
          "✅ Booking confirmation email sent successfully:",
          emailResult,
        );
      } catch (emailError) {
        console.error(
          "❌ Failed to send booking confirmation email:",
          emailError,
        );

        // Log more details about the error for debugging
        console.error("📧 Email error details:", {
          errorMessage: (emailError as Error)?.message,
          errorStack: (emailError as Error)?.stack,
          to: input.patientInfo.email,
          organizationName: org[0].name,
          hasResendKey: !!process.env.RESEND_API_KEY,
          resendKeyLength: process.env.RESEND_API_KEY?.length,
        });

        // Return error information to help with debugging
        console.warn(
          "⚠️ Appointment was created but email failed to send. Patient may not receive confirmation.",
        );
      }

      // Send notification to organization owners for free appointment
      try {
        await sendAppointmentNotificationToOwners(
          ctx.db,
          org[0].id,
          org[0].name,
          org[0].logo,
          {
            patientName: `${input.patientInfo.firstName} ${input.patientInfo.lastName}`,
            patientEmail: input.patientInfo.email,
            patientPhoneNumber: input.patientInfo.phoneNumber,
            appointmentTitle,
            appointmentDate: format(input.startTime, "EEEE, MMMM d, yyyy", {
              locale: fr,
            }),
            appointmentTime: `${format(input.startTime, "HH:mm")} - ${format(input.endTime, "HH:mm")}`,
            appointmentType: appointmentType[0].name,
            duration: appointmentType[0].defaultDurationMinutes,
            meetingLink: meetingData.meetingLink || undefined,
            notes: input.notes,
            isPaidAppointment: false,
            paymentStatus: "not_required",
          },
        );
      } catch (notificationError) {
        console.error(
          "Failed to send notification to organization owners:",
          notificationError,
        );
        // Don't fail the appointment creation if notification fails
      }

      return {
        success: true,
        appointmentId: newAppointment[0]!.id,
        requiresPayment: false,
        appointment: newAppointment[0],
        meetingLink: meetingData.meetingLink,
        message: meetingData.meetingLink
          ? "Rendez-vous réservé avec succès ! Vous recevrez une invitation Google Calendar et un e-mail de confirmation."
          : "Rendez-vous réservé avec succès ! Vous recevrez un e-mail de confirmation.",
      };
    }),

  // Retry payment for failed appointment
  retryPayment: publicProcedure
    .input(
      z.object({
        appointmentId: z.string().uuid("ID de rendez-vous invalide"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get appointment details
      const [appointmentDetails] = await ctx.db
        .select()
        .from(appointment)
        .where(eq(appointment.id, input.appointmentId))
        .limit(1);

      if (!appointmentDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rendez-vous non trouvé",
        });
      }

      // Check if appointment is in failed_payment or scheduled status
      if (
        appointmentDetails.status !== "failed_payment" &&
        appointmentDetails.status !== "scheduled"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce rendez-vous ne nécessite pas de nouveau paiement",
        });
      }

      // Get organization details
      const [org] = await ctx.db
        .select()
        .from(organization)
        .where(eq(organization.id, appointmentDetails.organizationId))
        .limit(1);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organisation non trouvée",
        });
      }

      // Get patient details
      const [patientDetails] = await ctx.db
        .select()
        .from(patient)
        .where(eq(patient.id, appointmentDetails.patientId))
        .limit(1);

      if (!patientDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient non trouvé",
        });
      }

      // Get appointment type details
      const [appointmentType] = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          eq(
            organizationAppointmentType.id,
            appointmentDetails.appointmentTypeId!,
          ),
        )
        .limit(1);

      if (!appointmentType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Type de rendez-vous non trouvé",
        });
      }

      // Create new Stripe checkout session
      const checkoutResult = await createStripeCheckoutSession({
        organizationId: org.id,
        appointmentId: input.appointmentId,
        appointmentTypeId: appointmentDetails.appointmentTypeId!,
        patientEmail: patientDetails.email!,
        patientName: `${patientDetails.firstName} ${patientDetails.lastName}`,
        successUrl: `${process.env.BETTER_AUTH_URL}/book/${org.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.BETTER_AUTH_URL}/book/${org.slug}/cancel?appointment_id=${input.appointmentId}&send_email=true`,
        db: ctx.db,
      });

      if (!checkoutResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Échec de la création du paiement",
        });
      }

      // Update appointment status to scheduled (payment pending again)
      await ctx.db
        .update(appointment)
        .set({
          status: "scheduled",
          paymentStatus: "pending",
          notes: `Payment retry initiated. New Stripe session: ${checkoutResult.sessionId}`,
          updatedAt: new Date(),
        })
        .where(eq(appointment.id, input.appointmentId));

      return {
        success: true,
        checkoutUrl: checkoutResult.url,
        message: "Redirection vers le paiement...",
      };
    }),

  // Handle cancelled payment (user went back from Stripe)
  handleCancelledPayment: publicProcedure
    .input(
      z.object({
        appointmentId: z.string().uuid("ID de rendez-vous invalide"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get appointment details
      const [appointmentDetails] = await ctx.db
        .select()
        .from(appointment)
        .where(eq(appointment.id, input.appointmentId))
        .limit(1);

      if (!appointmentDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rendez-vous non trouvé",
        });
      }

      // Only process if appointment is in scheduled status (payment pending)
      if (appointmentDetails.status !== "scheduled") {
        return { success: true, message: "Rendez-vous déjà traité" };
      }

      // Update appointment status to failed_payment
      await ctx.db
        .update(appointment)
        .set({
          status: "failed_payment",
          paymentStatus: "failed",
          notes: `Payment cancelled by user`,
          updatedAt: new Date(),
        })
        .where(eq(appointment.id, input.appointmentId));

      // Send retry email for cancelled payment
      try {
        // Get patient and organization details for email
        const [patientDetails] = await ctx.db
          .select()
          .from(patient)
          .where(eq(patient.id, appointmentDetails.patientId))
          .limit(1);

        const [org] = await ctx.db
          .select()
          .from(organization)
          .where(eq(organization.id, appointmentDetails.organizationId))
          .limit(1);

        if (patientDetails && org) {
          const retryUrl = `${process.env.BETTER_AUTH_URL}/book/${org.slug}/cancel?appointment_id=${input.appointmentId}`;

          const emailResult = await emailService.sendPaymentRetryEmail({
            to: patientDetails.email!,
            patientName: `${patientDetails.firstName} ${patientDetails.lastName}`,
            organizationName: org.name,
            organizationLogo: org.logo || undefined,
            appointmentTitle: appointmentDetails.title,
            appointmentDate:
              appointmentDetails.startTime.toLocaleDateString("fr-FR"),
            appointmentTime: appointmentDetails.startTime.toLocaleTimeString(
              "fr-FR",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            ),
            retryPaymentUrl: retryUrl,
          });

          if (emailResult.error) {
            console.error(
              "Failed to send retry payment email:",
              emailResult.error,
            );
          } else {
            console.log(
              `✅ Payment retry email sent to: ${patientDetails.email}`,
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending retry email:", emailError);
      }

      return {
        success: true,
        message: "Statut mis à jour et e-mail de relance envoyé",
      };
    }),
});

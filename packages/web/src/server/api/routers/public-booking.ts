import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";
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
} from "@acme/shared/server";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { GoogleCalendarService, emailService } from "@acme/shared/server";
import { addMinutes, addDays, format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

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

      // Get existing appointments for the date
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

      // Check for slot availability
      const conflictingAppointment = await ctx.db
        .select()
        .from(appointment)
        .where(
          and(
            eq(appointment.organizationId, org[0].id),
            eq(appointment.status, "scheduled"),
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

      // Create meeting link if needed
      let meetingData: {
        meetingLink: string | null;
        meetingId: string | null;
      } = { meetingLink: null, meetingId: null };
      try {
        console.log("🎥 Attempting to create Google Meet link...");
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
          console.log("✅ Google Meet link created successfully");
          console.log(
            "📧 Google Calendar invitation should be sent automatically to:",
            input.patientInfo.email,
          );
        } else {
          console.log(
            "ℹ️ No Google Meet link created (not an online appointment or Google not configured)",
          );
        }
      } catch (meetingError) {
        console.error("❌ Failed to create Google Meet link:", meetingError);
        console.log(
          "📧 Will still send confirmation email without meeting link",
        );
        meetingData = { meetingLink: null, meetingId: null };
      }

      // Create the appointment
      const newAppointment = await ctx.db
        .insert(appointment)
        .values({
          title: appointmentTitle,
          description: input.notes,
          startTime: input.startTime,
          endTime: input.endTime,
          status: "scheduled",
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

      return {
        success: true,
        appointment: newAppointment[0],
        meetingLink: meetingData.meetingLink,
        message: meetingData.meetingLink
          ? "Rendez-vous réservé avec succès ! Vous recevrez une invitation Google Calendar et un e-mail de confirmation."
          : "Rendez-vous réservé avec succès ! Vous recevrez un e-mail de confirmation.",
      };
    }),
});

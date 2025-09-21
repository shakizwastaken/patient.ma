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
import { addMinutes, format, startOfDay, endOfDay } from "date-fns";

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
) {
  const dayOfWeek = date.getDay();
  const dayAvailability = availability.find((av) => av.dayOfWeek === dayOfWeek);

  if (!dayAvailability || !dayAvailability.isAvailable) {
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

  let currentTime = new Date(startTime);

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

      if (!hasConflict) {
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
        title: `Book with ${org[0].name}`, // Generate title from organization name
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

      // Get appointment configuration
      const config = await ctx.db
        .select()
        .from(organizationAppointmentConfig)
        .where(eq(organizationAppointmentConfig.organizationId, org[0].id))
        .limit(1);

      const appointmentConfig = config[0] || {
        slotDurationMinutes: 30,
        bufferTimeMinutes: 0,
      };

      // Generate available slots
      const slots = generateTimeSlots(
        availability,
        existingAppointments,
        selectedDate,
        appointmentConfig.slotDurationMinutes,
        appointmentConfig.bufferTimeMinutes,
        org[0].timezone,
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

      // Create appointment title
      const appointmentTitle = `${appointmentType[0].name} - ${input.patientInfo.firstName} ${input.patientInfo.lastName}`;

      // Create meeting link if needed
      const meetingData = await createMeetingLinkIfNeeded(
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
          createdById: patientId, // Use patient ID as creator for public bookings
          meetingLink: meetingData.meetingLink,
          meetingId: meetingData.meetingId,
        })
        .returning();

      // Send confirmation email
      try {
        await emailService.sendPublicBookingConfirmation({
          to: input.patientInfo.email,
          patientName: `${input.patientInfo.firstName} ${input.patientInfo.lastName}`,
          organizationName: org[0].name,
          organizationLogo: org[0].logo || undefined,
          organizationDescription: org[0].description || undefined,
          appointmentType: appointmentType[0].name,
          appointmentDate: format(input.startTime, "EEEE, MMMM d, yyyy"),
          appointmentTime: `${format(input.startTime, "h:mm a")} - ${format(input.endTime, "h:mm a")}`,
          duration: appointmentType[0].defaultDurationMinutes,
          meetingLink: meetingData.meetingLink || undefined,
          notes: input.notes || undefined,
        });
      } catch (emailError) {
        console.error("Failed to send booking confirmation email:", emailError);
        // Don't throw error - appointment was created successfully, just log email failure
      }

      return {
        success: true,
        appointment: newAppointment[0],
        meetingLink: meetingData.meetingLink,
        message: "Appointment booked successfully!",
      };
    }),
});

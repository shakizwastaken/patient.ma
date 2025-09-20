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

import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";
import { GoogleCalendarService } from "@acme/shared/server";

// Helper function to create Google Meet link if needed
async function createMeetingLinkIfNeeded(
  ctx: any,
  appointmentData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    appointmentTypeId?: string;
  },
  patientEmail?: string,
) {
  console.log("🔍 Checking if meeting link needed for appointment:", {
    appointmentTypeId: appointmentData.appointmentTypeId,
    title: appointmentData.title,
  });

  try {
    // Check if online conferencing is enabled and if this appointment type requires it
    const config = await ctx.db
      .select()
      .from(organizationAppointmentConfig)
      .where(
        eq(organizationAppointmentConfig.organizationId, ctx.organization.id),
      )
      .limit(1);

    const appointmentConfig = config[0];
    console.log("📋 Appointment config:", {
      onlineConferencingEnabled: appointmentConfig?.onlineConferencingEnabled,
      configuredAppointmentTypeId:
        appointmentConfig?.onlineConferencingAppointmentTypeId,
      requestedAppointmentTypeId: appointmentData.appointmentTypeId,
    });

    if (!appointmentConfig?.onlineConferencingEnabled) {
      console.log("❌ Online conferencing not enabled");
      return { meetingLink: null, meetingId: null };
    }

    // Check if this appointment type is the one configured for online conferencing
    if (
      appointmentData.appointmentTypeId !==
      appointmentConfig.onlineConferencingAppointmentTypeId
    ) {
      console.log("❌ Appointment type doesn't match configured online type");
      return { meetingLink: null, meetingId: null };
    }

    console.log("✅ Creating meeting link for online appointment");

    // Get organization's Google integration tokens
    const org = await ctx.db
      .select({
        googleAccessToken: organization.googleAccessToken,
        googleRefreshToken: organization.googleRefreshToken,
        googleIntegrationEnabled: organization.googleIntegrationEnabled,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    const orgData = org[0];
    if (!orgData?.googleIntegrationEnabled) {
      console.warn("❌ Google integration not enabled for this organization");
      return { meetingLink: null, meetingId: null };
    }

    if (!orgData?.googleAccessToken) {
      console.warn(
        "❌ No Google access token available - please reconnect Google integration",
      );
      return { meetingLink: null, meetingId: null };
    }

    console.log("✅ Google integration is enabled and has access token");

    // Create Google Calendar service with token refresh callback
    const calendarService = new GoogleCalendarService(
      orgData.googleAccessToken,
      orgData.googleRefreshToken,
      async (newAccessToken: string, expiryDate?: Date) => {
        // Update the database with the new access token
        await ctx.db
          .update(organization)
          .set({
            googleAccessToken: newAccessToken,
            googleTokenExpiresAt: expiryDate,
          })
          .where(eq(organization.id, ctx.organization.id));

        console.log("💾 Updated database with new Google access token");
      },
    );

    // Prepare attendee emails (patient only - organizer will be added automatically)
    const attendeeEmails = [];
    if (patientEmail) {
      attendeeEmails.push(patientEmail);
      console.log("👤 Adding patient as attendee:", patientEmail);
    }

    // Create calendar event with Meet link
    const meetingResult = await calendarService.createMeetingEvent({
      summary: appointmentData.title,
      description: appointmentData.description,
      startTime: appointmentData.startTime.toISOString(),
      endTime: appointmentData.endTime.toISOString(),
      attendeeEmails,
    });

    console.log("🎉 Meeting link created successfully:", {
      meetingLink: meetingResult.meetingLink,
      eventId: meetingResult.eventId,
    });

    return {
      meetingLink: meetingResult.meetingLink,
      meetingId: meetingResult.eventId,
    };
  } catch (error: any) {
    console.error("❌ Error creating meeting link:", error);

    // If token expired, user needs to reconnect Google integration
    if (error.message === "GOOGLE_TOKEN_EXPIRED") {
      console.warn(
        "🔑 Google token expired for organization",
        ctx.organization.id,
        "- Please reconnect Google integration in settings",
      );
    }

    // Don't fail the appointment creation if meeting link creation fails
    return { meetingLink: null, meetingId: null };
  }
}

// Input validation schemas
const createAppointmentSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().optional(),
    startTime: z.date(),
    endTime: z.date(),
    type: z
      .enum(["consultation", "follow_up", "emergency", "checkup", "procedure"])
      .default("consultation"),
    appointmentTypeId: z
      .string()
      .uuid("Invalid appointment type ID")
      .optional(),
    patientId: z.string().uuid("Invalid patient ID"),
    notes: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

const updateAppointmentSchema = z
  .object({
    id: z.string().uuid("Invalid appointment ID"),
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title too long")
      .optional(),
    description: z.string().optional(),
    startTime: z.date().optional(),
    endTime: z.date().optional(),
    type: z
      .enum(["consultation", "follow_up", "emergency", "checkup", "procedure"])
      .optional(),
    appointmentTypeId: z
      .string()
      .uuid("Invalid appointment type ID")
      .optional(),
    status: z
      .enum(["scheduled", "completed", "cancelled", "no_show"])
      .optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

const getAppointmentsSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
});

// Helper function to validate appointment availability
async function validateAppointmentAvailability(
  ctx: any,
  startTime: Date,
  endTime: Date,
) {
  const dayOfWeek = startTime.getDay();

  console.log(
    `Validating appointment for ${startTime.toISOString()} - ${endTime.toISOString()}, dayOfWeek: ${dayOfWeek}`,
  );

  // Check organization availability for this day
  const dayAvailability = await ctx.db
    .select()
    .from(organizationAvailability)
    .where(
      and(
        eq(organizationAvailability.organizationId, ctx.organization.id),
        eq(organizationAvailability.dayOfWeek, dayOfWeek),
        eq(organizationAvailability.isAvailable, true),
      ),
    )
    .limit(1);

  if (dayAvailability.length === 0) {
    console.log(
      `No availability found for dayOfWeek: ${dayOfWeek} (${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek]})`,
    );
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Le cabinet n'est pas ouvert ce jour-là",
    });
  }

  // Check if appointment time is within available hours
  const [availableStartHour, availableStartMinute] =
    dayAvailability[0].startTime.split(":").map(Number);
  const [availableEndHour, availableEndMinute] = dayAvailability[0].endTime
    .split(":")
    .map(Number);

  const availableStartTime = new Date(startTime);
  availableStartTime.setHours(availableStartHour, availableStartMinute, 0, 0);

  const availableEndTime = new Date(startTime);
  availableEndTime.setHours(availableEndHour, availableEndMinute, 0, 0);

  if (startTime < availableStartTime || endTime > availableEndTime) {
    console.log(`Time validation failed:`, {
      requestedStart: startTime.toISOString(),
      requestedEnd: endTime.toISOString(),
      availableStart: availableStartTime.toISOString(),
      availableEnd: availableEndTime.toISOString(),
      dayAvailability: dayAvailability[0],
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Le rendez-vous doit être programmé entre ${dayAvailability[0].startTime} et ${dayAvailability[0].endTime}`,
    });
  }

  // Check for schedule overrides
  const overrides = await ctx.db
    .select()
    .from(organizationScheduleOverride)
    .where(
      and(
        eq(organizationScheduleOverride.organizationId, ctx.organization.id),
        lte(organizationScheduleOverride.startDate, endTime),
        gte(organizationScheduleOverride.endDate, startTime),
      ),
    );

  for (const override of overrides) {
    if (override.type === "unavailable") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Impossible de programmer un rendez-vous pendant cette période: ${override.title}`,
      });
    }
  }

  return true;
}

export const appointmentsRouter = createTRPCRouter({
  // Get appointments for the active organization
  getAll: organizationProcedure
    .input(getAppointmentsSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Build conditions
        const conditions = [
          eq(appointment.organizationId, ctx.organization.id),
        ];

        if (input.startDate) {
          conditions.push(gte(appointment.startTime, input.startDate));
        }

        if (input.endDate) {
          conditions.push(lte(appointment.startTime, input.endDate));
        }

        if (input.patientId) {
          conditions.push(eq(appointment.patientId, input.patientId));
        }

        if (input.status) {
          conditions.push(eq(appointment.status, input.status));
        }

        const query = ctx.db
          .select({
            id: appointment.id,
            title: appointment.title,
            description: appointment.description,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            type: appointment.type,
            notes: appointment.notes,
            meetingLink: appointment.meetingLink,
            meetingId: appointment.meetingId,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            patient: {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              phoneNumber: patient.phoneNumber,
            },
          })
          .from(appointment)
          .innerJoin(patient, eq(appointment.patientId, patient.id))
          .where(and(...conditions));

        const appointments = await query.orderBy(appointment.startTime);

        return appointments;
      } catch (error) {
        console.error("Error fetching appointments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch appointments",
        });
      }
    }),

  // Get appointments for a specific date range (for calendar view)
  getByDateRange: organizationProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const appointments = await ctx.db
          .select({
            id: appointment.id,
            title: appointment.title,
            description: appointment.description,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            type: appointment.type,
            meetingLink: appointment.meetingLink,
            meetingId: appointment.meetingId,
            appointmentType: {
              id: organizationAppointmentType.id,
              name: organizationAppointmentType.name,
              color: organizationAppointmentType.color,
            },
            patient: {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
            },
          })
          .from(appointment)
          .innerJoin(patient, eq(appointment.patientId, patient.id))
          .leftJoin(
            organizationAppointmentType,
            eq(appointment.appointmentTypeId, organizationAppointmentType.id),
          )
          .where(
            and(
              eq(appointment.organizationId, ctx.organization.id),
              gte(appointment.startTime, input.startDate),
              lte(appointment.startTime, input.endDate),
            ),
          )
          .orderBy(appointment.startTime);

        return appointments;
      } catch (error) {
        console.error("Error fetching appointments by date range:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch appointments",
        });
      }
    }),

  // Get a single appointment by ID
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid appointment ID") }))
    .query(async ({ ctx, input }) => {
      try {
        const [result] = await ctx.db
          .select({
            id: appointment.id,
            title: appointment.title,
            description: appointment.description,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            type: appointment.type,
            notes: appointment.notes,
            meetingLink: appointment.meetingLink,
            meetingId: appointment.meetingId,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            patient: {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              phoneNumber: patient.phoneNumber,
              age: patient.age,
              birthDate: patient.birthDate,
            },
          })
          .from(appointment)
          .innerJoin(patient, eq(appointment.patientId, patient.id))
          .where(
            and(
              eq(appointment.id, input.id),
              eq(appointment.organizationId, ctx.organization.id),
            ),
          );

        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Appointment not found in your organization",
          });
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error fetching appointment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch appointment",
        });
      }
    }),

  // Create a new appointment
  create: organizationProcedure
    .input(createAppointmentSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("🚀 Starting appointment creation with input:", {
        title: input.title,
        startTime: input.startTime,
        endTime: input.endTime,
        patientId: input.patientId,
        appointmentTypeId: input.appointmentTypeId,
        organizationId: ctx.organization.id,
      });

      try {
        // Verify that the patient belongs to the organization
        const patientExists = await ctx.db
          .select({ id: patient.id })
          .from(patient)
          .innerJoin(
            patientOrganization,
            eq(patient.id, patientOrganization.patientId),
          )
          .where(
            and(
              eq(patient.id, input.patientId),
              eq(patientOrganization.organizationId, ctx.organization.id),
            ),
          );

        if (patientExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found in your organization",
          });
        }

        // Validate appointment availability
        await validateAppointmentAvailability(
          ctx,
          input.startTime,
          input.endTime,
        );

        // Check for scheduling conflicts
        const conflictingAppointments = await ctx.db
          .select({ id: appointment.id })
          .from(appointment)
          .where(
            and(
              eq(appointment.organizationId, ctx.organization.id),
              eq(appointment.patientId, input.patientId),
              eq(appointment.status, "scheduled"),
              // Check for time overlap
              and(
                lte(appointment.startTime, input.endTime),
                gte(appointment.endTime, input.startTime),
              ),
            ),
          );

        if (conflictingAppointments.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Patient already has an appointment during this time",
          });
        }

        // Get patient data for meeting invitation and email
        const patientData = await ctx.db
          .select({
            email: patient.email,
            firstName: patient.firstName,
            lastName: patient.lastName,
          })
          .from(patient)
          .where(eq(patient.id, input.patientId))
          .limit(1);

        // Create meeting link if needed
        const { meetingLink, meetingId } = await createMeetingLinkIfNeeded(
          ctx,
          {
            title: input.title,
            description: input.description,
            startTime: input.startTime,
            endTime: input.endTime,
            appointmentTypeId: input.appointmentTypeId,
          },
          patientData[0]?.email || undefined,
        );

        const [newAppointment] = await ctx.db
          .insert(appointment)
          .values({
            ...input,
            organizationId: ctx.organization.id,
            createdById: ctx.user.id,
            meetingLink,
            meetingId,
          })
          .returning();

        // Google Calendar API handles all notifications automatically
        if (meetingLink) {
          console.log(
            "📅 Online appointment created - Google Calendar invites sent automatically",
          );
          console.log(
            "🎉 Both organizer and patient will receive Google Calendar invites with meeting link",
          );
        } else {
          console.log(
            "📋 Regular appointment created - no calendar invites needed",
          );
        }

        return newAppointment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error creating appointment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create appointment",
        });
      }
    }),

  // Update an appointment
  update: organizationProcedure
    .input(updateAppointmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Remove undefined values from update data
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined),
      );

      if (Object.keys(cleanUpdateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      try {
        // First verify the appointment belongs to the active organization
        const appointmentExists = await ctx.db
          .select({ id: appointment.id })
          .from(appointment)
          .where(
            and(
              eq(appointment.id, id),
              eq(appointment.organizationId, ctx.organization.id),
            ),
          );

        if (appointmentExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Appointment not found in your organization",
          });
        }

        // If startTime or endTime is being updated, validate availability
        if (cleanUpdateData.startTime || cleanUpdateData.endTime) {
          // Get the current appointment to use existing times if not being updated
          const currentAppointment = await ctx.db
            .select()
            .from(appointment)
            .where(eq(appointment.id, id))
            .limit(1);

          if (currentAppointment.length > 0) {
            const startTime = cleanUpdateData.startTime
              ? new Date(cleanUpdateData.startTime)
              : currentAppointment[0]!.startTime;
            const endTime = cleanUpdateData.endTime
              ? new Date(cleanUpdateData.endTime)
              : currentAppointment[0]!.endTime;

            await validateAppointmentAvailability(ctx, startTime, endTime);
          }
        }

        const [updatedAppointment] = await ctx.db
          .update(appointment)
          .set({
            ...cleanUpdateData,
            updatedAt: new Date(),
          })
          .where(eq(appointment.id, id))
          .returning();

        return updatedAppointment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error updating appointment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update appointment",
        });
      }
    }),

  // Delete an appointment
  delete: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid appointment ID") }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First verify the appointment belongs to the active organization
        const appointmentExists = await ctx.db
          .select({ id: appointment.id })
          .from(appointment)
          .where(
            and(
              eq(appointment.id, input.id),
              eq(appointment.organizationId, ctx.organization.id),
            ),
          );

        if (appointmentExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Appointment not found in your organization",
          });
        }

        const [deletedAppointment] = await ctx.db
          .delete(appointment)
          .where(eq(appointment.id, input.id))
          .returning();

        return { success: true, deletedAppointment };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error deleting appointment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete appointment",
        });
      }
    }),

  // Get upcoming appointments (next 7 days)
  getUpcoming: organizationProcedure.query(async ({ ctx }) => {
    try {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      const appointments = await ctx.db
        .select({
          id: appointment.id,
          title: appointment.title,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          type: appointment.type,
          patient: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
          },
        })
        .from(appointment)
        .innerJoin(patient, eq(appointment.patientId, patient.id))
        .where(
          and(
            eq(appointment.organizationId, ctx.organization.id),
            eq(appointment.status, "scheduled"),
            gte(appointment.startTime, now),
            lte(appointment.startTime, nextWeek),
          ),
        )
        .orderBy(appointment.startTime)
        .limit(10);

      return appointments;
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch upcoming appointments",
      });
    }
  }),
});

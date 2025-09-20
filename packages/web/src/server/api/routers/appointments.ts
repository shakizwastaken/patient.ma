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
} from "@acme/shared/server";

import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";

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

        const [newAppointment] = await ctx.db
          .insert(appointment)
          .values({
            ...input,
            organizationId: ctx.organization.id,
            createdById: ctx.user.id,
          })
          .returning();

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

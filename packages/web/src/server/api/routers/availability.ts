import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  organizationAvailability,
  organizationScheduleOverride,
  organizationAppointmentConfig,
  appointment,
  organization,
} from "@acme/shared/server";

import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";
import {
  convertAvailabilityToUTC,
  convertAvailabilityFromUTC,
} from "@/lib/timezone";

// Input validation schemas
const createAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6, "Invalid day of week"), // 0 = Sunday, 6 = Saturday
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), // HH:MM format
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), // HH:MM format
  isAvailable: z.boolean().default(true),
});

const createScheduleOverrideSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date(),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    type: z
      .enum(["unavailable", "reduced_hours", "maintenance", "holiday"])
      .default("unavailable"),
    isRecurring: z.boolean().default(false),
    recurringPattern: z.string().optional(), // JSON string
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

const updateAppointmentConfigSchema = z.object({
  slotDurationMinutes: z.number().min(15).max(120).default(30),
  bufferTimeMinutes: z.number().min(0).max(60).default(0),
  advanceBookingDays: z.number().min(1).max(365).default(30),
  sameDayBookingAllowed: z.boolean().default(true),
  maxAppointmentsPerDay: z.number().min(1).optional(),
});

export const availabilityRouter = createTRPCRouter({
  // Get organization availability schedule
  getAvailability: organizationProcedure.query(async ({ ctx }) => {
    // Get organization timezone
    const org = await ctx.db
      .select({ timezone: organization.timezone })
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    const organizationTimezone = org[0]?.timezone || 
      (org[0] as any)?.metadata?.timezone || 
      "Africa/Casablanca";

    const availability = await ctx.db
      .select()
      .from(organizationAvailability)
      .where(eq(organizationAvailability.organizationId, ctx.organization.id))
      .orderBy(organizationAvailability.dayOfWeek);

    // Convert times from UTC to organization timezone for display
    const convertedAvailability = availability.map((av) => {
      const converted = convertAvailabilityFromUTC(
        av.startTime,
        av.endTime,
        av.dayOfWeek,
        organizationTimezone,
      );

      return {
        ...av,
        startTime: converted.startTime,
        endTime: converted.endTime,
      };
    });

    return convertedAvailability;
  }),

  // Create or update availability for a day
  setAvailability: organizationProcedure
    .input(createAvailabilitySchema)
    .mutation(async ({ ctx, input }) => {
      // Get organization timezone
      const org = await ctx.db
        .select({ timezone: organization.timezone })
        .from(organization)
        .where(eq(organization.id, ctx.organization.id))
        .limit(1);

      const organizationTimezone = org[0]?.timezone || 
      (org[0] as any)?.metadata?.timezone || 
      "Africa/Casablanca";

      // Convert times from organization timezone to UTC for storage
      const { startTimeUtc, endTimeUtc } = convertAvailabilityToUTC(
        input.startTime,
        input.endTime,
        input.dayOfWeek,
        organizationTimezone,
      );

      // Check if availability already exists for this day
      const existing = await ctx.db
        .select()
        .from(organizationAvailability)
        .where(
          and(
            eq(organizationAvailability.organizationId, ctx.organization.id),
            eq(organizationAvailability.dayOfWeek, input.dayOfWeek),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await ctx.db
          .update(organizationAvailability)
          .set({
            startTime: startTimeUtc,
            endTime: endTimeUtc,
            isAvailable: input.isAvailable,
            updatedAt: new Date(),
          })
          .where(eq(organizationAvailability.id, existing[0]!.id));

        return {
          success: true,
          message: "Disponibilité mise à jour avec succès",
        };
      } else {
        // Create new
        await ctx.db.insert(organizationAvailability).values({
          organizationId: ctx.organization.id,
          dayOfWeek: input.dayOfWeek,
          startTime: startTimeUtc,
          endTime: endTimeUtc,
          isAvailable: input.isAvailable,
        });

        return { success: true, message: "Disponibilité créée avec succès" };
      }
    }),

  // Get schedule overrides
  getScheduleOverrides: organizationProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .select()
        .from(organizationScheduleOverride)
        .where(
          eq(organizationScheduleOverride.organizationId, ctx.organization.id),
        );

      if (input.startDate && input.endDate) {
        query = ctx.db
          .select()
          .from(organizationScheduleOverride)
          .where(
            and(
              eq(
                organizationScheduleOverride.organizationId,
                ctx.organization.id,
              ),
              lte(organizationScheduleOverride.startDate, input.endDate),
              gte(organizationScheduleOverride.endDate, input.startDate),
            ),
          );
      }

      const overrides = await query.orderBy(
        desc(organizationScheduleOverride.startDate),
      );
      return overrides;
    }),

  // Create schedule override
  createScheduleOverride: organizationProcedure
    .input(createScheduleOverrideSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(organizationScheduleOverride).values({
        organizationId: ctx.organization.id,
        title: input.title,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type,
        isRecurring: input.isRecurring,
        recurringPattern: input.recurringPattern,
      });

      return {
        success: true,
        message: "Override de planning créé avec succès",
      };
    }),

  // Delete schedule override
  deleteScheduleOverride: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(organizationScheduleOverride)
        .where(
          and(
            eq(organizationScheduleOverride.id, input.id),
            eq(
              organizationScheduleOverride.organizationId,
              ctx.organization.id,
            ),
          ),
        );

      return {
        success: true,
        message: "Override de planning supprimé avec succès",
      };
    }),

  // Get appointment configuration
  getAppointmentConfig: organizationProcedure.query(async ({ ctx }) => {
    const config = await ctx.db
      .select()
      .from(organizationAppointmentConfig)
      .where(
        eq(organizationAppointmentConfig.organizationId, ctx.organization.id),
      )
      .limit(1);

    if (config.length === 0) {
      // Create default config if none exists
      const defaultConfig = {
        organizationId: ctx.organization.id,
        slotDurationMinutes: 30,
        bufferTimeMinutes: 0,
        advanceBookingDays: 30,
        sameDayBookingAllowed: true,
      };

      await ctx.db.insert(organizationAppointmentConfig).values(defaultConfig);
      return defaultConfig;
    }

    return config[0];
  }),

  // Update appointment configuration
  updateAppointmentConfig: organizationProcedure
    .input(updateAppointmentConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(organizationAppointmentConfig)
        .where(
          eq(organizationAppointmentConfig.organizationId, ctx.organization.id),
        )
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .update(organizationAppointmentConfig)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(organizationAppointmentConfig.id, existing[0]!.id));
      } else {
        await ctx.db.insert(organizationAppointmentConfig).values({
          organizationId: ctx.organization.id,
          ...input,
        });
      }

      return {
        success: true,
        message: "Configuration des rendez-vous mise à jour avec succès",
      };
    }),

  // Get available time slots for a specific date
  getAvailableSlots: organizationProcedure
    .input(
      z.object({
        date: z.date(),
        durationMinutes: z.number().min(15).max(120).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dayOfWeek = input.date.getDay(); // 0 = Sunday, 6 = Saturday

      // Get organization availability for this day
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
        return []; // No availability for this day
      }

      // Get appointment configuration
      const config = await ctx.db
        .select()
        .from(organizationAppointmentConfig)
        .where(
          eq(organizationAppointmentConfig.organizationId, ctx.organization.id),
        )
        .limit(1);

      const slotDuration = config[0]?.slotDurationMinutes ?? 30;
      const bufferTime = config[0]?.bufferTimeMinutes ?? 0;

      // Get existing appointments for this date
      const startOfDay = new Date(input.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(input.date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await ctx.db
        .select()
        .from(appointment)
        .where(
          and(
            eq(appointment.organizationId, ctx.organization.id),
            gte(appointment.startTime, startOfDay),
            lte(appointment.startTime, endOfDay),
            eq(appointment.status, "scheduled"), // Only consider scheduled appointments
          ),
        );

      // Generate available time slots
      const availableSlots = [];
      const [startHour, startMinute] = (
        dayAvailability[0]?.startTime ?? "09:00"
      )
        .split(":")
        .map(Number);
      const [endHour, endMinute] = (dayAvailability[0]?.endTime ?? "17:00")
        .split(":")
        .map(Number);

      const startTime = new Date(input.date);
      startTime.setHours(startHour ?? 9, startMinute ?? 0, 0, 0);

      const endTime = new Date(input.date);
      endTime.setHours(endHour ?? 17, endMinute ?? 0, 0, 0);

      let currentSlot = new Date(startTime);

      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot);
        slotEnd.setMinutes(slotEnd.getMinutes() + input.durationMinutes);

        if (slotEnd <= endTime) {
          // Check if this slot conflicts with existing appointments
          const hasConflict = existingAppointments.some((apt) => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);

            return (
              (currentSlot >= aptStart && currentSlot < aptEnd) ||
              (slotEnd > aptStart && slotEnd <= aptEnd) ||
              (currentSlot <= aptStart && slotEnd >= aptEnd)
            );
          });

          if (!hasConflict) {
            availableSlots.push({
              startTime: new Date(currentSlot),
              endTime: new Date(slotEnd),
              available: true,
            });
          }
        }

        // Move to next slot
        currentSlot.setMinutes(
          currentSlot.getMinutes() + slotDuration + bufferTime,
        );
      }

      return availableSlots;
    }),
});

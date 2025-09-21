import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { organizationAppointmentType } from "@acme/shared/server";

import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";

// Input validation schemas
const createAppointmentTypeSchema = z
  .object({
    name: z.string().min(1, "Le nom est requis").max(100, "Nom trop long"),
    description: z.string().optional(),
    defaultDurationMinutes: z
      .number()
      .min(5, "La durée minimum est de 5 minutes")
      .max(480, "La durée maximum est de 8 heures")
      .default(30),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Format de couleur invalide (hex)")
      .default("#3b82f6"),
    // Payment configuration
    requiresPayment: z.boolean().default(false),
    stripeProductId: z.string().optional(),
    stripePriceId: z.string().optional(),
    paymentType: z.enum(["one_time", "subscription"]).default("one_time"),
  })
  .refine(
    (data) => {
      // If payment is required, Stripe product ID and price ID must be provided
      if (data.requiresPayment) {
        return data.stripeProductId && data.stripePriceId;
      }
      return true;
    },
    {
      message: "Veuillez sélectionner un produit et un prix Stripe",
      path: ["stripePriceId"],
    },
  );

const updateAppointmentTypeSchema = z
  .object({
    id: z.string().uuid("ID de type de rendez-vous invalide"),
    name: z
      .string()
      .min(1, "Le nom est requis")
      .max(100, "Nom trop long")
      .optional(),
    description: z.string().optional(),
    defaultDurationMinutes: z
      .number()
      .min(5, "La durée minimum est de 5 minutes")
      .max(480, "La durée maximum est de 8 heures")
      .optional(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Format de couleur invalide (hex)")
      .optional(),
    isActive: z.boolean().optional(),
    // Payment configuration
    requiresPayment: z.boolean().optional(),
    stripeProductId: z.string().optional().nullable(),
    stripePriceId: z.string().optional().nullable(),
    paymentType: z.enum(["one_time", "subscription"]).optional(),
  })
  .refine(
    (data) => {
      // If payment is required, Stripe product ID and price ID must be provided
      if (data.requiresPayment) {
        return data.stripeProductId && data.stripePriceId;
      }
      return true;
    },
    {
      message: "Veuillez sélectionner un produit et un prix Stripe",
      path: ["stripePriceId"],
    },
  );

export const appointmentTypesRouter = createTRPCRouter({
  // Get all appointment types for the organization
  getAppointmentTypes: organizationProcedure.query(async ({ ctx }) => {
    const appointmentTypes = await ctx.db
      .select()
      .from(organizationAppointmentType)
      .where(
        eq(organizationAppointmentType.organizationId, ctx.organization.id),
      )
      .orderBy(desc(organizationAppointmentType.createdAt));

    return appointmentTypes;
  }),

  // Get a single appointment type by ID
  getAppointmentType: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appointmentType = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          eq(organizationAppointmentType.id, input.id) &&
            eq(organizationAppointmentType.organizationId, ctx.organization.id),
        )
        .limit(1);

      if (appointmentType.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Type de rendez-vous non trouvé",
        });
      }

      return appointmentType[0];
    }),

  // Create a new appointment type
  createAppointmentType: organizationProcedure
    .input(createAppointmentTypeSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if appointment type with same name already exists
      const existingType = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          eq(organizationAppointmentType.organizationId, ctx.organization.id),
        );

      const nameExists = existingType.some(
        (type) => type.name.toLowerCase() === input.name.toLowerCase(),
      );

      if (nameExists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un type de rendez-vous avec ce nom existe déjà",
        });
      }

      const [newAppointmentType] = await ctx.db
        .insert(organizationAppointmentType)
        .values({
          ...input,
          organizationId: ctx.organization.id,
        })
        .returning();

      return newAppointmentType;
    }),

  // Update an existing appointment type
  updateAppointmentType: organizationProcedure
    .input(updateAppointmentTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if appointment type exists and belongs to organization
      const existingType = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          eq(organizationAppointmentType.id, id) &&
            eq(organizationAppointmentType.organizationId, ctx.organization.id),
        )
        .limit(1);

      if (existingType.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Type de rendez-vous non trouvé",
        });
      }

      // Check for name conflicts if name is being updated
      if (updateData.name) {
        const allTypes = await ctx.db
          .select()
          .from(organizationAppointmentType)
          .where(
            eq(organizationAppointmentType.organizationId, ctx.organization.id),
          );

        const nameExists = allTypes.some(
          (type) =>
            type.id !== id &&
            type.name.toLowerCase() === updateData.name!.toLowerCase(),
        );

        if (nameExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Un type de rendez-vous avec ce nom existe déjà",
          });
        }
      }

      const [updatedAppointmentType] = await ctx.db
        .update(organizationAppointmentType)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(organizationAppointmentType.id, id))
        .returning();

      return updatedAppointmentType;
    }),

  // Delete an appointment type
  deleteAppointmentType: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if appointment type exists and belongs to organization
      const existingType = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          eq(organizationAppointmentType.id, input.id) &&
            eq(organizationAppointmentType.organizationId, ctx.organization.id),
        )
        .limit(1);

      if (existingType.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Type de rendez-vous non trouvé",
        });
      }

      // TODO: Check if any appointments are using this type before deletion
      // For now, we'll allow deletion and set appointment type to null

      await ctx.db
        .delete(organizationAppointmentType)
        .where(eq(organizationAppointmentType.id, input.id));

      return { success: true };
    }),

  // Toggle active status of an appointment type
  toggleActive: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existingType = await ctx.db
        .select()
        .from(organizationAppointmentType)
        .where(
          eq(organizationAppointmentType.id, input.id) &&
            eq(organizationAppointmentType.organizationId, ctx.organization.id),
        )
        .limit(1);

      if (existingType.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Type de rendez-vous non trouvé",
        });
      }

      const [updatedType] = await ctx.db
        .update(organizationAppointmentType)
        .set({
          isActive: !existingType[0]!.isActive,
          updatedAt: new Date(),
        })
        .where(eq(organizationAppointmentType.id, input.id))
        .returning();

      return updatedType;
    }),
});

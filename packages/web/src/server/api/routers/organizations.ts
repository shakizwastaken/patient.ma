import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { organization } from "@acme/shared/server";

import { createTRPCRouter, organizationProcedure } from "@/server/api/trpc";

const updateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  slug: z.string().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  publicBookingEnabled: z.boolean().optional(),
});

export const organizationsRouter = createTRPCRouter({
  // Get organization details with all custom fields
  getCurrent: organizationProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, ctx.organization.id))
      .limit(1);

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return org;
  }),

  // Update organization details
  update: organizationProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify the organization belongs to the user
      if (id !== ctx.organization.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own organization",
        });
      }

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
        const [updatedOrganization] = await ctx.db
          .update(organization)
          .set({
            ...cleanUpdateData,
            // Always update the updatedAt timestamp if it exists
            // Note: updatedAt doesn't exist in the current schema, but keeping this for consistency
          })
          .where(eq(organization.id, id))
          .returning();

        return updatedOrganization;
      } catch (error) {
        console.error("Error updating organization:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update organization",
        });
      }
    }),
});

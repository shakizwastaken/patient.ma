import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { organization } from "@acme/shared/server";
import { count, desc, like } from "drizzle-orm";

export const organizationsRouter = createTRPCRouter({
  getOrganizations: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      
      const whereCondition = input.search
        ? like(organization.name, `%${input.search}%`)
        : undefined;

      const organizations = await ctx.db
        .select()
        .from(organization)
        .where(whereCondition)
        .limit(input.limit)
        .offset(offset)
        .orderBy(desc(organization.createdAt));

      const [totalCount] = await ctx.db
        .select({ count: count() })
        .from(organization)
        .where(whereCondition);

      return {
        organizations,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / input.limit),
      };
    }),

  updateOrganizationCredits: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        credits: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement credit system in organization schema
      // For now, just return success
      return { success: true };
    }),
});

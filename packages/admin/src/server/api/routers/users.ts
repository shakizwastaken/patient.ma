import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { user } from "@acme/shared/server";
import { count, desc, like, and, eq } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
  getUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        organizationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      
      let whereCondition;
      if (input.search) {
        whereCondition = and(
          like(user.name, `%${input.search}%`),
          // Add organization filter if provided
          input.organizationId ? eq(user.id, input.organizationId) : undefined
        );
      } else if (input.organizationId) {
        whereCondition = eq(user.id, input.organizationId);
      }

      const users = await ctx.db
        .select()
        .from(user)
        .where(whereCondition)
        .limit(input.limit)
        .offset(offset)
        .orderBy(desc(user.createdAt));

      const [totalCount] = await ctx.db
        .select({ count: count() })
        .from(user)
        .where(whereCondition);

      return {
        users,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / input.limit),
      };
    }),
});

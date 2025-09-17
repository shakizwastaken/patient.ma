import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { user, organization } from "@acme/shared/server";
import { count, sql } from "drizzle-orm";

export const analyticsRouter = createTRPCRouter({
  getAnalytics: adminProcedure
    .input(
      z.object({
        period: z.enum(["today", "7d", "30d", "90d", "1y", "all"]),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (input.period) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Get total counts
      const [totalUsers] = await ctx.db
        .select({ count: count() })
        .from(user)
        .where(input.period === "all" ? undefined : sql`${user.createdAt} >= ${startDate}`);

      const [totalOrganizations] = await ctx.db
        .select({ count: count() })
        .from(organization)
        .where(input.period === "all" ? undefined : sql`${organization.createdAt} >= ${startDate}`);

      // Mock subscriber count for now (you can add a subscription table later)
      const totalSubscribers = Math.floor((totalUsers?.count || 0) * 0.25);

      return {
        summary: {
          totalUsers: totalUsers?.count || 0,
          totalOrganizations: totalOrganizations?.count || 0,
          totalSubscribers,
        },
        // TODO: Add time series data queries
        usersOverTime: [],
        subscribersOverTime: [],
        cumulativeUsersOverTime: [],
        cumulativeSubscribersOverTime: [],
      };
    }),
});

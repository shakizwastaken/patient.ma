import { analyticsRouter } from "@/server/api/routers/analytics";
import { usersRouter } from "@/server/api/routers/users";
import { organizationsRouter } from "@/server/api/routers/organizations";
import { subscriptionsRouter } from "@/server/api/routers/subscriptions";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for the admin server.
 * All routers are merged directly without nesting.
 */
export const appRouter = createTRPCRouter({
  // Analytics routes
  analytics: analyticsRouter,

  // User management routes
  users: usersRouter,

  // Organization management routes
  organizations: organizationsRouter,

  // Subscription management routes
  subscriptions: subscriptionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

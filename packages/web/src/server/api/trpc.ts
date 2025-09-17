/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db, auth } from "@acme/shared/server";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Get the session from the request headers
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  // Get active organization if user is authenticated
  let activeOrganization = null;
  if (session?.user) {
    try {
      activeOrganization = await auth.api.getFullOrganization({
        headers: opts.headers,
      });
    } catch (error) {
      // User might not have an active organization, which is fine
      console.log("No active organization found for user");
    }
  }

  return {
    db,
    session,
    user: session?.user,
    activeOrganization,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Authentication middleware
 *
 * Ensures that the user is authenticated before proceeding
 */
const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Organization middleware
 *
 * Ensures that the user is authenticated AND has an active organization
 */
const organizationMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!ctx.activeOrganization) {
    throw new Error("NO_ACTIVE_ORGANIZATION");
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      organization: ctx.activeOrganization,
    },
  });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(authMiddleware);

/**
 * Organization procedure
 *
 * If you want a query or mutation to ONLY be accessible to users with an active organization, use this.
 * It verifies the session is valid and guarantees `ctx.organization` is available.
 * This automatically scopes operations to the user's active organization.
 */
export const organizationProcedure = t.procedure
  .use(timingMiddleware)
  .use(organizationMiddleware);

import { postRouter } from "@/server/api/routers/post";
import { patientsRouter } from "@/server/api/routers/patients";
import { appointmentsRouter } from "@/server/api/routers/appointments";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  patients: patientsRouter,
  appointments: appointmentsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

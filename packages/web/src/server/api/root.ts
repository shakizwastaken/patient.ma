import { postRouter } from "@/server/api/routers/post";
import { patientsRouter } from "@/server/api/routers/patients";
import { appointmentsRouter } from "@/server/api/routers/appointments";
import { availabilityRouter } from "@/server/api/routers/availability";
import { appointmentTypesRouter } from "@/server/api/routers/appointment-types";
import { googleIntegrationRouter } from "@/server/api/routers/google-integration";
import { publicBookingRouter } from "@/server/api/routers/public-booking";
import { organizationsRouter } from "@/server/api/routers/organizations";
import { stripeRouter } from "@/server/api/routers/stripe";
import { invitationsRouter } from "@/server/api/routers/invitations";
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
  availability: availabilityRouter,
  appointmentTypes: appointmentTypesRouter,
  googleIntegration: googleIntegrationRouter,
  publicBooking: publicBookingRouter,
  organizations: organizationsRouter,
  stripe: stripeRouter,
  invitations: invitationsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

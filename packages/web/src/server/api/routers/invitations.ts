import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { invitation, organization, user } from "@acme/shared/server";
import { eq, and, gt } from "drizzle-orm";

export const invitationsRouter = createTRPCRouter({
  // Get invitation details by ID (public endpoint for invitation acceptance)
  getById: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Invitation ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get invitation with organization and inviter details
      const [invite] = await ctx.db
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
          },
          inviter: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
        .from(invitation)
        .leftJoin(organization, eq(invitation.organizationId, organization.id))
        .leftJoin(user, eq(invitation.inviterId, user.id))
        .where(
          and(
            eq(invitation.id, input.id),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!invite) {
        throw new Error("Invitation not found or has expired");
      }

      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        organization: invite.organization,
        inviter: invite.inviter,
      };
    }),
});

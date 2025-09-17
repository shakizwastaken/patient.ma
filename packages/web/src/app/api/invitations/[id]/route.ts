import { NextRequest, NextResponse } from "next/server";
import { db, invitation, organization, user } from "@acme/shared/server";
import { eq, and, gt } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 },
      );
    }

    // Get invitation with organization and inviter details
    const [invite] = await db
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
          eq(invitation.id, id),
          eq(invitation.status, "pending"),
          gt(invitation.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found or has expired" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        organization: invite.organization,
        inviter: {
          user: invite.inviter,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get invitation:", error);
    return NextResponse.json(
      { error: "Failed to load invitation details" },
      { status: 500 },
    );
  }
}

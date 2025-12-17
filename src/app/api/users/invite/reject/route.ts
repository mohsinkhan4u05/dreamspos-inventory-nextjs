import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInvitationToken } from "@/lib/invitation-token";

/**
 * POST /api/users/invite/reject
 * Reject an invitation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Validate token
    const validation = await validateInvitationToken(token);
    if (!validation.valid || !validation.invitation) {
      return NextResponse.json(
        { error: validation.error || "Invalid invitation" },
        { status: 400 }
      );
    }

    // Mark invitation as revoked
    await prisma.userInvitation.update({
      where: { id: validation.invitation.id },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation rejected successfully",
    });

  } catch (error) {
    console.error("Error rejecting invitation:", error);
    return NextResponse.json(
      { error: "Failed to reject invitation" },
      { status: 500 }
    );
  }
}

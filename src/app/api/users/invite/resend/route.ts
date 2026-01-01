import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import {
  generateInvitationToken,
  calculateExpiryDate,
} from "@/lib/invitation-token";
import {
  generateInvitationEmailHTML,
  generateInvitationEmailText,
} from "@/lib/email/invitation-template";
import { sendEmail } from "@/lib/email/send-email";

/**
 * POST /api/users/invite/resend
 * Resend invitation email (SUPER_ADMIN only)
 */
export const POST = withPermission("users", "create", async (request, user) => {
  try {
    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get existing invitation
    const existingInvitation = await prisma.userInvitation.findUnique({
      where: { id: invitationId },
      include: {
        role: true,
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!existingInvitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (existingInvitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only resend pending invitations" },
        { status: 400 }
      );
    }

    // Generate new token and expiry
    const token = generateInvitationToken();
    const expiresAt = calculateExpiryDate();

    // Update invitation with new token and expiry
    const invitation = await prisma.userInvitation.update({
      where: { id: invitationId },
      data: {
        token,
        expiresAt,
      },
      include: {
        role: true,
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get organization name
    const orgName = process.env.ORGANIZATION_NAME || "DreamsPOS";

    // Generate invitation URL
    const baseUrl = process.env.APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invite/accept?token=${token}`;

    // Prepare email data
    const recipientName = invitation.firstName || invitation.lastName || invitation.email.split("@")[0];
    const inviterName = `${invitation.invitedBy.firstName || ""} ${invitation.invitedBy.lastName || ""}`.trim() || invitation.invitedBy.email;

    const emailData = {
      recipientName,
      recipientEmail: invitation.email,
      inviterName,
      organizationName: orgName,
      invitationUrl,
      expiryDays: 25,
    };

    // Send invitation email
    try {
      await sendEmail({
        to: invitation.email,
        subject: `Invitation to join ${orgName}`,
        html: generateInvitationEmailHTML(emailData),
        text: generateInvitationEmailText(emailData),
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    });

  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
});

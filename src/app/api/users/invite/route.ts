import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import {
  generateInvitationToken,
  calculateExpiryDate,
  hasPendingInvitation,
  isEmailRegistered,
} from "@/lib/invitation-token";
import {
  generateInvitationEmailHTML,
  generateInvitationEmailText,
} from "@/lib/email/invitation-template";
import { sendEmail } from "@/lib/email/send-email";

/**
 * POST /api/users/invite
 * Invite a new user (SUPER_ADMIN only)
 */
export const POST = withPermission("users", "create", async (request, user) => {
  try {
    const body = await request.json();
    const { email, firstName, lastName, roleId } = body;

    // Validation
    if (!email || !roleId) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email is already registered
    if (await isEmailRegistered(emailLower)) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    if (await hasPendingInvitation(emailLower)) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 400 }
      );
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Invalid role selected" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = generateInvitationToken();
    const expiresAt = calculateExpiryDate();

    // Create invitation
    const invitation = await prisma.userInvitation.create({
      data: {
        email: emailLower,
        firstName,
        lastName,
        roleId,
        token,
        expiresAt,
        invitedById: user.id,
        status: "PENDING",
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

    // Get organization name (you can make this dynamic from settings)
    const orgName = process.env.ORGANIZATION_NAME || "DreamsPOS";

    // Generate invitation URL
    const baseUrl =
      process.env.APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const invitationUrl = `${baseUrl}/invite/accept?token=${token}`;

    // Prepare email data
    const recipientName = firstName || lastName || emailLower.split("@")[0];
    const inviterName = `${invitation.invitedBy.firstName || ""} ${invitation.invitedBy.lastName || ""}`.trim() || invitation.invitedBy.email;

    const emailData = {
      recipientName,
      recipientEmail: emailLower,
      inviterName,
      organizationName: orgName,
      invitationUrl,
      expiryDays: 25,
    };

    // Send invitation email
    try {
      await sendEmail({
        to: emailLower,
        subject: `Invitation to join ${orgName}`,
        html: generateInvitationEmailHTML(emailData),
        text: generateInvitationEmailText(emailData),
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request if email fails, but log it
      // You might want to implement a retry mechanism here
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role.displayName,
        expiresAt: invitation.expiresAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
});

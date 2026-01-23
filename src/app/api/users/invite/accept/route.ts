import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateInvitationToken, revokePendingInvitations } from "@/lib/invitation-token";

/**
 * POST /api/users/invite/accept
 * Accept an invitation and create user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, firstName, lastName } = body;

    // Validation
    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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

    const invitation = validation.invitation;

    // Check if user already exists (double-check)
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate username from email
    const username =
      invitation.email.split("@")[0] + "_" + Math.random().toString(36).substring(7);

    // Create user and update invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          username,
          password: hashedPassword,
          firstName: firstName || invitation.firstName || "",
          lastName: lastName || invitation.lastName || "",
          roleId: invitation.roleId,
          status: "ACTIVE",
          isActive: true,
          joinedAt: new Date(),
          invitedAt: invitation.createdAt,
        },
        include: {
          customRole: true,
        },
      });

      // Mark invitation as accepted
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      // Revoke any other pending invitations for this email
      await tx.userInvitation.updateMany({
        where: {
          email: invitation.email,
          id: { not: invitation.id },
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.customRole?.displayName,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}

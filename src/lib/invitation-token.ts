import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Generate a secure random invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calculate expiry date (25 days from now)
 */
export function calculateExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 25);
  return expiryDate;
}

/**
 * Validate invitation token
 * Returns invitation if valid, null otherwise
 */
export async function validateInvitationToken(token: string) {
  try {
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: {
        role: true,
        invitedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      return { valid: false, error: "Invalid invitation token", invitation: null };
    }

    // Check if already accepted
    if (invitation.status === "ACCEPTED") {
      return { valid: false, error: "Invitation already accepted", invitation: null };
    }

    // Check if revoked
    if (invitation.status === "REVOKED") {
      return { valid: false, error: "Invitation has been revoked", invitation: null };
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      // Auto-mark as expired
      await prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return { valid: false, error: "Invitation has expired", invitation: null };
    }

    // Check if status is pending
    if (invitation.status !== "PENDING") {
      return { valid: false, error: "Invitation is not pending", invitation: null };
    }

    return { valid: true, error: null, invitation };
  } catch (error) {
    console.error("Error validating invitation token:", error);
    return { valid: false, error: "Failed to validate invitation", invitation: null };
  }
}

/**
 * Check if email already has a pending invitation
 */
export async function hasPendingInvitation(email: string): Promise<boolean> {
  const invitation = await prisma.userInvitation.findFirst({
    where: {
      email: email.toLowerCase(),
      status: "PENDING",
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return !!invitation;
}

/**
 * Check if email is already registered
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  return !!user;
}

/**
 * Revoke all pending invitations for an email
 */
export async function revokePendingInvitations(email: string): Promise<void> {
  await prisma.userInvitation.updateMany({
    where: {
      email: email.toLowerCase(),
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
    },
  });
}

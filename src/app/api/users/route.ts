import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";

/**
 * GET /api/users
 * List all users with their roles and status
 */
export const GET = withPermission("users", "read", async () => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: {
          not: "INACTIVE",
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        isActive: true,
        roleId: true,
        invitedAt: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
        customRole: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isSystemRole: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Also get pending invitations
    const pendingInvitations = await prisma.userInvitation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        createdAt: true,
        expiresAt: true,
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      users,
      pendingInvitations,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
});

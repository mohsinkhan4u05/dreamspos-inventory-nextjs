import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";

/**
 * PATCH /api/users/[id]/status
 * Update user status (activate/deactivate)
 * SUPER_ADMIN only
 */
export const PATCH = withPermission(
  "users",
  "update",
  async (request: NextRequest, user, context?: { params?: { id?: string } }) => {
    try {
      const userId = context?.params?.id;

      if (!userId) {
        return NextResponse.json(
          { error: "User id is required" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { isActive, status } = body;

      if (isActive === undefined && !status) {
        return NextResponse.json(
          { error: "isActive or status is required" },
          { status: 400 }
        );
      }

      // Prevent deactivating yourself
      if (userId === user.id && isActive === false) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 }
        );
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(status && { status }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      return NextResponse.json(
        { error: "Failed to update user status" },
        { status: 500 }
      );
    }
  }
);

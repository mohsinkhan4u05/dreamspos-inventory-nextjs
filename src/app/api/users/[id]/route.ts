import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";

/**
 * DELETE /api/users/[id]
 * Soft delete a user (SUPER_ADMIN only)
 */
export const DELETE = withPermission(
  "users",
  "delete",
  async (request: NextRequest, user, context?: { params?: { id?: string } }) => {
    try {
      const userId = context?.params?.id;

      if (!userId) {
        return NextResponse.json(
          { error: "User id is required" },
          { status: 400 }
        );
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        return NextResponse.json(
          { error: "You cannot delete your own account" },
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

      // Soft delete: deactivate the user
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          status: "INACTIVE",
        },
      });

      return NextResponse.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  }
);

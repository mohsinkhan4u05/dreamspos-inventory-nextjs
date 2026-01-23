import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";

/**
 * PATCH /api/users/[id]/role
 * Update a user's assigned role (roleId) – Super Admin / users.manage only
 */
export const PATCH = withPermission(
  "users",
  "manage",
  async (request: NextRequest, user, context?: { params?: { id?: string } }) => {
    try {
      const userId = context?.params?.id;

      if (!userId) {
        return NextResponse.json({ error: "User id is required" }, { status: 400 });
      }

      const body = await request.json();
      const { roleId } = body as { roleId?: string };

      if (typeof roleId !== "string") {
        return NextResponse.json({ error: "roleId is required" }, { status: 400 });
      }

      if (userId === user.id) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({ where: { id: userId } });

      if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const existingRole = await prisma.role.findUnique({ where: { id: roleId } });

      if (!existingRole || existingRole.isActive === false) {
        return NextResponse.json({ error: "Role not found or inactive" }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { roleId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roleId: true,
          customRole: {
            select: {
              id: true,
              name: true,
              displayName: true,
              isSystemRole: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user role:", error);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }
  }
);

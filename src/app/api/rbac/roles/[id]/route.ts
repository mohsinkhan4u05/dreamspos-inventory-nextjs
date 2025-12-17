import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import { auditLog } from "@/lib/rbac/audit";

// GET /api/rbac/roles/[id] - Get role by ID
export const GET = withPermission("roles", "read", async (request, user, context) => {
  try {
    const { id } = context.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
});

// PUT /api/rbac/roles/[id] - Update role
export const PUT = withPermission("roles", "update", async (request, user, context) => {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { displayName, description, permissionIds, isActive } = body;

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Prevent editing system roles
    if (role.isSystemRole) {
      return NextResponse.json(
        { error: "Cannot edit system roles" },
        { status: 403 }
      );
    }

    // Update role
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        displayName,
        description,
        isActive,
      },
    });

    // Update permissions if provided
    if (permissionIds && Array.isArray(permissionIds)) {
      // Delete existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Create new permissions
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    // Audit log
    await auditLog.roleUpdated(user.id, role.id, role.displayName, body, request);

    // Fetch complete role with permissions
    const finalRole = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json({ role: finalRole });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
});

// DELETE /api/rbac/roles/[id] - Delete role
export const DELETE = withPermission("roles", "delete", async (request, user, context) => {
  try {
    const { id } = context.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Prevent deleting system roles
    if (role.isSystemRole) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 403 }
      );
    }

    // Prevent deleting roles with assigned users
    if (role._count.users > 0) {
      return NextResponse.json(
        { error: `Cannot delete role with ${role._count.users} assigned user(s)` },
        { status: 400 }
      );
    }

    // Delete role (cascade will delete rolePermissions)
    await prisma.role.delete({
      where: { id },
    });

    // Audit log
    await auditLog.roleDeleted(user.id, role.id, role.displayName, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
});

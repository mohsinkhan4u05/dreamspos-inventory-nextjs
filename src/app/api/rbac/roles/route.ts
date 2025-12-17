import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import { auditLog } from "@/lib/rbac/audit";

// GET /api/rbac/roles - List all roles
export const GET = withPermission("roles", "read", async (request, user) => {
  try {
    const roles = await prisma.role.findMany({
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
      orderBy: [
        { isSystemRole: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
});

// POST /api/rbac/roles - Create a new role
export const POST = withPermission("roles", "create", async (request, user) => {
  try {
    const body = await request.json();
    const { name, displayName, description, permissionIds } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and display name are required" },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existing = await prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        description,
        isSystemRole: false,
      },
    });

    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds)) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    // Audit log
    await auditLog.roleCreated(user.id, role.id, role.displayName, request);

    // Fetch complete role with permissions
    const createdRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json({ role: createdRole }, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";

// GET /api/rbac/permissions - List all permissions
export const GET = withPermission("roles", "read", async () => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { resource: "asc" },
        { action: "asc" },
      ],
    });

    // Group permissions by resource
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({ permissions, grouped });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
});

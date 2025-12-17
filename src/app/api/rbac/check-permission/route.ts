import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasPermission, PermissionAction, PermissionResource } from "@/lib/rbac/permissions";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { resource, action } = body;

    if (!resource || !action) {
      return NextResponse.json(
        { error: "Resource and action are required" },
        { status: 400 }
      );
    }

    const user = {
      id: token.sub,
      role: token.role as UserRole,
      roleId: token.roleId as string | null | undefined,
    };

    const hasAccess = await hasPermission(
      user,
      resource as PermissionResource,
      action as PermissionAction
    );

    return NextResponse.json({ hasPermission: hasAccess });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

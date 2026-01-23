import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasPermission, PermissionAction, PermissionResource } from "./permissions";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string | null;
  roleId?: string | null;
}

/**
 * Middleware to check if user has required permission
 * Returns 401 if not authenticated, 403 if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  resource: PermissionResource,
  action: PermissionAction
): Promise<{ authorized: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    // Get user from JWT token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.sub) {
      return {
        authorized: false,
        error: "Unauthorized - No valid session",
      };
    }

    const user: AuthenticatedUser = {
      id: token.sub,
      email: token.email as string,
      role: token.role as string | null | undefined,
      roleId: token.roleId as string | null | undefined,
    };

    // Check permission
    const hasAccess = await hasPermission(user, resource, action);

    if (!hasAccess) {
      return {
        authorized: false,
        user,
        error: `Forbidden - Missing permission: ${resource}.${action}`,
      };
    }

    return {
      authorized: true,
      user,
    };
  } catch (error) {
    console.error("Permission middleware error:", error);
    return {
      authorized: false,
      error: "Internal server error",
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with permission check
 */
export function withPermission(
  resource: PermissionResource,
  action: PermissionAction,
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    const { authorized, user, error } = await requirePermission(
      request,
      resource,
      action
    );

    if (!authorized) {
      const status = error?.includes("Unauthorized") ? 401 : 403;
      return NextResponse.json(
        { error: error || "Access denied" },
        { status }
      );
    }

    return handler(request, user!, context);
  };
}

/**
 * Check multiple permissions (AND logic)
 */
export async function requireAllPermissions(
  request: NextRequest,
  permissions: Array<{ resource: PermissionResource; action: PermissionAction }>
): Promise<{ authorized: boolean; user?: AuthenticatedUser; error?: string }> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.sub) {
    return {
      authorized: false,
      error: "Unauthorized - No valid session",
    };
  }

  const user: AuthenticatedUser = {
    id: token.sub,
    email: token.email as string,
    role: token.role as string | null | undefined,
    roleId: token.roleId as string | null | undefined,
  };

  for (const perm of permissions) {
    const hasAccess = await hasPermission(user, perm.resource, perm.action);
    if (!hasAccess) {
      return {
        authorized: false,
        user,
        error: `Forbidden - Missing permission: ${perm.resource}.${perm.action}`,
      };
    }
  }

  return {
    authorized: true,
    user,
  };
}

/**
 * Check if user has any of the permissions (OR logic)
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Array<{ resource: PermissionResource; action: PermissionAction }>
): Promise<{ authorized: boolean; user?: AuthenticatedUser; error?: string }> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.sub) {
    return {
      authorized: false,
      error: "Unauthorized - No valid session",
    };
  }

  const user: AuthenticatedUser = {
    id: token.sub,
    email: token.email as string,
    role: token.role as UserRole,
    roleId: token.roleId as string | null | undefined,
  };

  for (const perm of permissions) {
    const hasAccess = await hasPermission(user, perm.resource, perm.action);
    if (hasAccess) {
      return {
        authorized: true,
        user,
      };
    }
  }

  return {
    authorized: false,
    user,
    error: "Forbidden - Missing required permissions",
  };
}

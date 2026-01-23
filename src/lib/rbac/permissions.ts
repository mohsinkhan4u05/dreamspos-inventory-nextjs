import { prisma } from "@/lib/prisma";

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "email"
  | "export"
  | "manage"
  | "adjust"
  | "complete"
  | "cancel";
export type PermissionResource =
  | "sales"
  | "purchase"
  | "inventory"
  | "customers"
  | "vendors"
  | "packages"
  | "shipments"
  | "payments"
  | "reports"
  | "users"
  | "roles"
  | "settings"
  | "products"
  | "stores"
  | "manufacturing";

export interface Permission {
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * Check if a user has a specific permission
 * 
 * Permission resolution order:
 * 1. If user has roleId and that role is an active system SUPER_ADMIN, grant all permissions
 * 2. Otherwise, if user has roleId, check granular permissions via Role → RolePermission → Permission
 * 3. If user has no roleId, deny access by default
 */
export async function hasPermission(
  user: { id: string; roleId?: string | null },
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  try {
    // 1. SUPER_ADMIN system role has all permissions
    if (user.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: user.roleId },
        select: {
          name: true,
          isSystemRole: true,
          isActive: true,
        },
      });

      if (role && role.isSystemRole && role.isActive && role.name === "SUPER_ADMIN") {
        return true;
      }

      // 2. Check granular permissions for other roles
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: user.roleId,
          permission: {
            resource,
            action,
          },
        },
        include: {
          role: true,
          permission: true,
        },
      });

      if (rolePermission && rolePermission.role.isActive) {
        return true;
      }
    }

    // If user has roleId but no matching permission, deny access
    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user has multiple permissions (AND logic)
 */
export async function hasAllPermissions(
  user: { id: string; roleId?: string | null },
  permissions: Permission[]
): Promise<boolean> {
  for (const perm of permissions) {
    const has = await hasPermission(user, perm.resource, perm.action);
    if (!has) return false;
  }
  return true;
}

/**
 * Check if user has any of the permissions (OR logic)
 */
export async function hasAnyPermission(
  user: { id: string; roleId?: string | null },
  permissions: Permission[]
): Promise<boolean> {
  for (const perm of permissions) {
    const has = await hasPermission(user, perm.resource, perm.action);
    if (has) return true;
  }
  return false;
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string
): Promise<Permission[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customRole: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) return [];

  // If user has custom role and it's SUPER_ADMIN system role, return all permissions
  if (
    user.customRole &&
    user.customRole.isActive &&
    user.customRole.isSystemRole &&
    user.customRole.name === "SUPER_ADMIN"
  ) {
    const allPermissions = await prisma.permission.findMany();
    return allPermissions.map((p) => ({
      resource: p.resource as PermissionResource,
      action: p.action as PermissionAction,
    }));
  }

  // If user has another active custom role, return those permissions
  if (user.customRole && user.customRole.isActive) {
    return user.customRole.rolePermissions.map((rp) => ({
      resource: rp.permission.resource as PermissionResource,
      action: rp.permission.action as PermissionAction,
    }));
  }

  // No custom role configured: no permissions
  return [];
}

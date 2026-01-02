import { prisma } from "@/lib/prisma";
import { User, UserRole } from "@prisma/client";

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
 * 1. SUPER_ADMIN always has all permissions
 * 2. If user has roleId, check granular permissions via Role → RolePermission → Permission
 * 3. Fallback to enum-based role permissions (backward compatibility)
 */
export async function hasPermission(
  user: User | { id: string; role: UserRole; roleId?: string | null },
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  try {
    // 1. SUPER_ADMIN has all permissions
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // 2. Check granular permissions if user has a custom role
    if (user.roleId) {
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

      // If user has roleId but no matching permission, deny access
      return false;
    }

    // 3. Fallback to enum-based permissions (backward compatibility)
    return hasEnumBasedPermission(user.role, resource, action);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user has multiple permissions (AND logic)
 */
export async function hasAllPermissions(
  user: User | { id: string; role: UserRole; roleId?: string | null },
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
  user: User | { id: string; role: UserRole; roleId?: string | null },
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

  // SUPER_ADMIN has all permissions
  if (user.role === UserRole.SUPER_ADMIN) {
    const allPermissions = await prisma.permission.findMany();
    return allPermissions.map((p) => ({
      resource: p.resource as PermissionResource,
      action: p.action as PermissionAction,
    }));
  }

  // If user has custom role, return those permissions
  if (user.customRole && user.customRole.isActive) {
    return user.customRole.rolePermissions.map((rp) => ({
      resource: rp.permission.resource as PermissionResource,
      action: rp.permission.action as PermissionAction,
    }));
  }

  // Fallback to enum-based permissions
  return getEnumBasedPermissions(user.role);
}

/**
 * Backward compatibility: Enum-based permission checking
 */
function hasEnumBasedPermission(
  role: UserRole,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const permissions = ENUM_ROLE_PERMISSIONS[role] || [];
  return permissions.some(
    (p) => p.resource === resource && p.action === action
  );
}

/**
 * Get all permissions for an enum role
 */
function getEnumBasedPermissions(role: UserRole): Permission[] {
  return ENUM_ROLE_PERMISSIONS[role] || [];
}

/**
 * Legacy enum-based role permissions mapping
 * This ensures backward compatibility for existing users
 */
const ENUM_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [], // Handled separately (all permissions)
  
  ADMIN: [
    // Sales
    { resource: "sales", action: "read" },
    { resource: "sales", action: "create" },
    { resource: "sales", action: "update" },
    { resource: "sales", action: "delete" },
    { resource: "sales", action: "approve" },
    { resource: "sales", action: "email" },
    { resource: "sales", action: "export" },
    // Purchase
    { resource: "purchase", action: "read" },
    { resource: "purchase", action: "create" },
    { resource: "purchase", action: "update" },
    { resource: "purchase", action: "delete" },
    { resource: "purchase", action: "approve" },
    { resource: "purchase", action: "email" },
    { resource: "purchase", action: "export" },
    // Inventory
    { resource: "inventory", action: "read" },
    { resource: "inventory", action: "create" },
    { resource: "inventory", action: "update" },
    { resource: "inventory", action: "delete" },
    { resource: "inventory", action: "adjust" },
    { resource: "inventory", action: "export" },
    // Customers
    { resource: "customers", action: "read" },
    { resource: "customers", action: "create" },
    { resource: "customers", action: "update" },
    { resource: "customers", action: "delete" },
    { resource: "customers", action: "export" },
    // Vendors
    { resource: "vendors", action: "read" },
    { resource: "vendors", action: "create" },
    { resource: "vendors", action: "update" },
    { resource: "vendors", action: "delete" },
    { resource: "vendors", action: "export" },
    // Packages & Shipments
    { resource: "packages", action: "read" },
    { resource: "packages", action: "create" },
    { resource: "packages", action: "update" },
    { resource: "packages", action: "delete" },
    { resource: "shipments", action: "read" },
    { resource: "shipments", action: "create" },
    { resource: "shipments", action: "update" },
    { resource: "shipments", action: "delete" },
    // Payments
    { resource: "payments", action: "read" },
    { resource: "payments", action: "create" },
    { resource: "payments", action: "update" },
    { resource: "payments", action: "delete" },
    { resource: "payments", action: "export" },
    // Reports
    { resource: "reports", action: "read" },
    { resource: "reports", action: "export" },
    // Users
    { resource: "users", action: "read" },
    { resource: "users", action: "create" },
    { resource: "users", action: "update" },
    // Products
    { resource: "products", action: "read" },
    { resource: "products", action: "create" },
    { resource: "products", action: "update" },
    { resource: "products", action: "delete" },
    { resource: "products", action: "export" },
    // Stores
    { resource: "stores", action: "read" },
    { resource: "stores", action: "create" },
    { resource: "stores", action: "update" },
    // Settings
    { resource: "settings", action: "read" },
    // Manufacturing
    { resource: "manufacturing", action: "read" },
    { resource: "manufacturing", action: "create" },
    { resource: "manufacturing", action: "complete" },
    { resource: "manufacturing", action: "cancel" },
  ],

  MANAGER: [
    // Sales
    { resource: "sales", action: "read" },
    { resource: "sales", action: "create" },
    { resource: "sales", action: "update" },
    { resource: "sales", action: "email" },
    { resource: "sales", action: "export" },
    // Purchase
    { resource: "purchase", action: "read" },
    { resource: "purchase", action: "create" },
    { resource: "purchase", action: "update" },
    { resource: "purchase", action: "email" },
    { resource: "purchase", action: "export" },
    // Inventory
    { resource: "inventory", action: "read" },
    { resource: "inventory", action: "create" },
    { resource: "inventory", action: "update" },
    { resource: "inventory", action: "adjust" },
    { resource: "inventory", action: "export" },
    // Customers
    { resource: "customers", action: "read" },
    { resource: "customers", action: "create" },
    { resource: "customers", action: "update" },
    { resource: "customers", action: "export" },
    // Vendors
    { resource: "vendors", action: "read" },
    { resource: "vendors", action: "create" },
    { resource: "vendors", action: "update" },
    { resource: "vendors", action: "export" },
    // Packages & Shipments
    { resource: "packages", action: "read" },
    { resource: "packages", action: "create" },
    { resource: "packages", action: "update" },
    { resource: "shipments", action: "read" },
    { resource: "shipments", action: "create" },
    { resource: "shipments", action: "update" },
    // Payments
    { resource: "payments", action: "read" },
    { resource: "payments", action: "create" },
    { resource: "payments", action: "export" },
    // Reports
    { resource: "reports", action: "read" },
    { resource: "reports", action: "export" },
    // Products
    { resource: "products", action: "read" },
    { resource: "products", action: "create" },
    { resource: "products", action: "update" },
    { resource: "products", action: "export" },
    // Stores
    { resource: "stores", action: "read" },
    // Manufacturing (no cancel for managers by default)
    { resource: "manufacturing", action: "read" },
    { resource: "manufacturing", action: "create" },
    { resource: "manufacturing", action: "complete" },
  ],

  STAFF: [
    // Sales
    { resource: "sales", action: "read" },
    { resource: "sales", action: "create" },
    { resource: "sales", action: "update" },
    // Purchase
    { resource: "purchase", action: "read" },
    { resource: "purchase", action: "create" },
    // Inventory
    { resource: "inventory", action: "read" },
    { resource: "inventory", action: "update" },
    // Customers
    { resource: "customers", action: "read" },
    { resource: "customers", action: "create" },
    { resource: "customers", action: "update" },
    // Vendors
    { resource: "vendors", action: "read" },
    // Packages & Shipments
    { resource: "packages", action: "read" },
    { resource: "packages", action: "create" },
    { resource: "shipments", action: "read" },
    // Payments
    { resource: "payments", action: "read" },
    // Products
    { resource: "products", action: "read" },
    { resource: "products", action: "create" },
    { resource: "products", action: "update" },
    // Reports
    { resource: "reports", action: "read" },
  ],

  CASHIER: [
    // Sales (POS focused)
    { resource: "sales", action: "read" },
    { resource: "sales", action: "create" },
    // Customers
    { resource: "customers", action: "read" },
    { resource: "customers", action: "create" },
    // Payments
    { resource: "payments", action: "read" },
    { resource: "payments", action: "create" },
    // Products (read only)
    { resource: "products", action: "read" },
    // Inventory (read only)
    { resource: "inventory", action: "read" },
  ],
};

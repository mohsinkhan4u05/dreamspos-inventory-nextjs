/**
 * RBAC Types for Permission Matrix UI
 */

export type PermissionAction = "read" | "create" | "update" | "delete" | "approve" | "email" | "export" | "manage" | "adjust";

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
  | "stores";

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions?: RolePermission[];
  _count?: {
    users: number;
  };
}

/**
 * Permission Matrix State
 * Structure: { [resource]: { [action]: boolean } }
 */
export type PermissionMatrix = Record<string, Record<string, boolean>>;

/**
 * Grouped Permissions by Resource
 */
export type GroupedPermissions = Record<string, Permission[]>;

/**
 * Module Configuration for UI Display
 */
export interface ModuleConfig {
  resource: string;
  displayName: string;
  actions: PermissionAction[];
  description?: string;
}

/**
 * Standard modules with their available actions
 */
export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    resource: "sales",
    displayName: "Sales",
    actions: ["read", "create", "update", "delete", "approve", "email", "export"],
  },
  {
    resource: "purchase",
    displayName: "Purchase",
    actions: ["read", "create", "update", "delete", "approve", "email", "export"],
  },
  {
    resource: "inventory",
    displayName: "Inventory",
    actions: ["read", "create", "update", "delete", "adjust", "export"],
  },
  {
    resource: "customers",
    displayName: "Customers",
    actions: ["read", "create", "update", "delete", "export"],
  },
  {
    resource: "vendors",
    displayName: "Vendors",
    actions: ["read", "create", "update", "delete", "export"],
  },
  {
    resource: "packages",
    displayName: "Packages",
    actions: ["read", "create", "update", "delete"],
  },
  {
    resource: "shipments",
    displayName: "Shipments",
    actions: ["read", "create", "update", "delete"],
  },
  {
    resource: "payments",
    displayName: "Payments",
    actions: ["read", "create", "update", "delete", "export"],
  },
  {
    resource: "reports",
    displayName: "Reports",
    actions: ["read", "export"],
  },
  {
    resource: "products",
    displayName: "Products",
    actions: ["read", "create", "update", "delete", "export"],
  },
  {
    resource: "stores",
    displayName: "Stores",
    actions: ["read", "create", "update", "delete"],
  },
  {
    resource: "users",
    displayName: "Users",
    actions: ["read", "create", "update", "delete", "manage"],
  },
  {
    resource: "roles",
    displayName: "Roles",
    actions: ["read", "create", "update", "delete", "manage"],
  },
  {
    resource: "settings",
    displayName: "Settings",
    actions: ["read", "update", "manage"],
  },
];

/**
 * Get display name for action
 */
export function getActionDisplayName(action: string): string {
  const names: Record<string, string> = {
    read: "Read",
    create: "Create",
    update: "Update",
    delete: "Delete",
    approve: "Approve",
    email: "Email",
    export: "Export",
    manage: "Manage",
    adjust: "Adjust",
  };
  return names[action] || action;
}

/**
 * Get display name for resource
 */
export function getResourceDisplayName(resource: string): string {
  const config = MODULE_CONFIGS.find((m) => m.resource === resource);
  return config?.displayName || resource;
}

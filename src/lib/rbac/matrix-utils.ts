/**
 * Permission Matrix Utilities
 * Handles conversion between backend permissions and UI matrix state
 */

import { Permission, PermissionMatrix, GroupedPermissions } from "@/types/rbac";

/**
 * Convert array of permissions to matrix state
 * @example ["sales.read", "sales.create"] → { sales: { read: true, create: true } }
 */
export function permissionsToMatrix(permissions: Permission[]): PermissionMatrix {
  const matrix: PermissionMatrix = {};

  permissions.forEach((perm) => {
    if (!matrix[perm.resource]) {
      matrix[perm.resource] = {};
    }
    matrix[perm.resource][perm.action] = true;
  });

  return matrix;
}

/**
 * Convert matrix state to permission ID array
 * @param matrix UI matrix state
 * @param allPermissions All available permissions from backend
 * @returns Array of permission IDs
 */
export function matrixToPermissionIds(
  matrix: PermissionMatrix,
  allPermissions: Permission[]
): string[] {
  const permissionIds: string[] = [];

  Object.entries(matrix).forEach(([resource, actions]) => {
    Object.entries(actions).forEach(([action, enabled]) => {
      if (enabled) {
        const permission = allPermissions.find(
          (p) => p.resource === resource && p.action === action
        );
        if (permission) {
          permissionIds.push(permission.id);
        }
      }
    });
  });

  return permissionIds;
}

/**
 * Convert matrix state to permission string array
 * @example { sales: { read: true, create: true } } → ["sales.read", "sales.create"]
 */
export function matrixToPermissionStrings(matrix: PermissionMatrix): string[] {
  const permissions: string[] = [];

  Object.entries(matrix).forEach(([resource, actions]) => {
    Object.entries(actions).forEach(([action, enabled]) => {
      if (enabled) {
        permissions.push(`${resource}.${action}`);
      }
    });
  });

  return permissions;
}

/**
 * Group permissions by resource
 */
export function groupPermissionsByResource(
  permissions: Permission[]
): GroupedPermissions {
  const grouped: GroupedPermissions = {};

  permissions.forEach((perm) => {
    if (!grouped[perm.resource]) {
      grouped[perm.resource] = [];
    }
    grouped[perm.resource].push(perm);
  });

  return grouped;
}

/**
 * Check if a permission action should be enabled based on dependencies
 * Rule: Read is mandatory for all other actions
 */
export function shouldEnableAction(
  matrix: PermissionMatrix,
  resource: string,
  action: string
): boolean {
  // Read is always enabled
  if (action === "read") {
    return true;
  }

  // Other actions require Read to be enabled
  return matrix[resource]?.read === true;
}

/**
 * Auto-enable Read when any other action is selected
 */
export function autoEnableRead(
  matrix: PermissionMatrix,
  resource: string,
  action: string,
  value: boolean
): PermissionMatrix {
  const newMatrix = { ...matrix };

  if (!newMatrix[resource]) {
    newMatrix[resource] = {};
  }

  // If enabling any action other than read, auto-enable read
  if (value && action !== "read") {
    newMatrix[resource] = {
      ...newMatrix[resource],
      read: true,
      [action]: true,
    };
  } else {
    newMatrix[resource] = {
      ...newMatrix[resource],
      [action]: value,
    };
  }

  return newMatrix;
}

/**
 * Clear entire row when Read is unchecked
 */
export function clearRowOnReadDisable(
  matrix: PermissionMatrix,
  resource: string
): PermissionMatrix {
  const newMatrix = { ...matrix };

  if (newMatrix[resource]) {
    // Clear all actions for this resource
    newMatrix[resource] = {};
  }

  return newMatrix;
}

/**
 * Toggle all permissions for a specific action (column)
 */
export function toggleColumnAction(
  matrix: PermissionMatrix,
  action: string,
  resources: string[],
  value: boolean
): PermissionMatrix {
  const newMatrix = { ...matrix };

  resources.forEach((resource) => {
    if (!newMatrix[resource]) {
      newMatrix[resource] = {};
    }

    if (action === "read") {
      // Toggle read directly
      newMatrix[resource].read = value;
      // If disabling read, clear entire row
      if (!value) {
        newMatrix[resource] = {};
      }
    } else {
      // For other actions, ensure read is enabled first
      if (value) {
        newMatrix[resource].read = true;
        newMatrix[resource][action] = true;
      } else {
        newMatrix[resource][action] = false;
      }
    }
  });

  return newMatrix;
}

/**
 * Check if all resources have a specific action enabled
 */
export function isColumnFullySelected(
  matrix: PermissionMatrix,
  action: string,
  resources: string[]
): boolean {
  return resources.every((resource) => matrix[resource]?.[action] === true);
}

/**
 * Validate permission matrix
 */
export function validatePermissionMatrix(matrix: PermissionMatrix): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if at least one permission is selected
  const hasAnyPermission = Object.values(matrix).some((actions) =>
    Object.values(actions).some((enabled) => enabled)
  );

  if (!hasAnyPermission) {
    errors.push("At least one permission must be selected");
  }

  // Check for orphaned actions (actions without read)
  Object.entries(matrix).forEach(([resource, actions]) => {
    const hasRead = actions.read === true;
    const hasOtherActions = Object.entries(actions).some(
      ([action, enabled]) => action !== "read" && enabled
    );

    if (hasOtherActions && !hasRead) {
      errors.push(`${resource}: Read permission is required for other actions`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

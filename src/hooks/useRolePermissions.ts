"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Permission, PermissionMatrix, GroupedPermissions } from "@/types/rbac";
import {
  permissionsToMatrix,
  matrixToPermissionIds,
  autoEnableRead,
  clearRowOnReadDisable,
  toggleColumnAction,
  isColumnFullySelected,
  validatePermissionMatrix,
  groupPermissionsByResource,
} from "@/lib/rbac/matrix-utils";

export interface UseRolePermissionsReturn {
  matrix: PermissionMatrix;
  allPermissions: Permission[];
  groupedPermissions: GroupedPermissions;
  loading: boolean;
  error: string | null;
  togglePermission: (resource: string, action: string) => void;
  toggleColumn: (action: string, resources: string[]) => void;
  isColumnSelected: (action: string, resources: string[]) => boolean;
  getPermissionIds: () => string[];
  validate: () => { valid: boolean; errors: string[] };
  setMatrix: (matrix: PermissionMatrix) => void;
  resetMatrix: () => void;
}

/**
 * Hook for managing role permission matrix state
 */
export function useRolePermissions(
  initialPermissions?: Permission[]
): UseRolePermissionsReturn {
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable key representing the initial permissions, so useEffect doesn't
  // retrigger on every render when parent recreates the array
  const initialPermissionKey = useMemo(
    () =>
      initialPermissions && initialPermissions.length > 0
        ? initialPermissions
            .map((p) => p.id)
            .filter(Boolean)
            .sort()
            .join(",")
        : "",
    [initialPermissions]
  );

  // Fetch all available permissions from backend
  useEffect(() => {
    async function fetchPermissions() {
      try {
        setLoading(true);
        const response = await fetch("/api/rbac/permissions");
        
        if (!response.ok) {
          throw new Error("Failed to fetch permissions");
        }

        const data = await response.json();
        setAllPermissions(data.permissions || []);
        setGroupedPermissions(groupPermissionsByResource(data.permissions || []));

        // Initialize matrix with initial permissions if provided
        if (initialPermissions && initialPermissions.length > 0) {
          setMatrix(permissionsToMatrix(initialPermissions));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  // Update matrix when initial permissions meaningfully change.
  // Depend on the stable key and permission count, not the array reference,
  // to avoid infinite update loops when parents recreate the array each render.
  useEffect(() => {
    if (initialPermissionKey && allPermissions.length > 0 && initialPermissions && initialPermissions.length > 0) {
      setMatrix(permissionsToMatrix(initialPermissions));
    }
  }, [initialPermissionKey, allPermissions.length]);

  /**
   * Toggle a single permission checkbox
   */
  const togglePermission = useCallback((resource: string, action: string) => {
    setMatrix((prev) => {
      const currentValue = prev[resource]?.[action] || false;
      const newValue = !currentValue;

      // If unchecking Read, clear entire row
      if (action === "read" && !newValue) {
        return clearRowOnReadDisable(prev, resource);
      }

      // If checking any action, auto-enable Read
      return autoEnableRead(prev, resource, action, newValue);
    });
  }, []);

  /**
   * Toggle entire column (all resources for a specific action)
   */
  const toggleColumn = useCallback((action: string, resources: string[]) => {
    setMatrix((prev) => {
      const isFullySelected = isColumnFullySelected(prev, action, resources);
      return toggleColumnAction(prev, action, resources, !isFullySelected);
    });
  }, []);

  /**
   * Check if a column is fully selected
   */
  const isColumnSelected = useCallback(
    (action: string, resources: string[]) => {
      return isColumnFullySelected(matrix, action, resources);
    },
    [matrix]
  );

  /**
   * Get permission IDs for saving to backend
   */
  const getPermissionIds = useCallback(() => {
    return matrixToPermissionIds(matrix, allPermissions);
  }, [matrix, allPermissions]);

  /**
   * Validate current matrix state
   */
  const validate = useCallback(() => {
    return validatePermissionMatrix(matrix);
  }, [matrix]);

  /**
   * Reset matrix to empty state
   */
  const resetMatrix = useCallback(() => {
    setMatrix({});
  }, []);

  return {
    matrix,
    allPermissions,
    groupedPermissions,
    loading,
    error,
    togglePermission,
    toggleColumn,
    isColumnSelected,
    getPermissionIds,
    validate,
    setMatrix,
    resetMatrix,
  };
}

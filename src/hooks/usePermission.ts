import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PermissionAction, PermissionResource } from "@/lib/rbac/permissions";

export interface Permission {
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(
  resource: PermissionResource,
  action: PermissionAction
): {
  hasPermission: boolean;
  loading: boolean;
  user: any;
} {
  const { data: session, status } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (status === "loading") {
        setLoading(true);
        return;
      }

      if (!session?.user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        // Call API to check permission
        const response = await fetch("/api/rbac/check-permission", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resource, action }),
        });

        if (response.ok) {
          const data = await response.json();
          setHasPermission(data.hasPermission || false);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [session, status, resource, action]);

  return {
    hasPermission,
    loading,
    user: session?.user,
  };
}

/**
 * Hook to get all permissions for current user
 */
export function useUserPermissions(): {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (resource: PermissionResource, action: PermissionAction) => boolean;
} {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (status === "loading") {
        setLoading(true);
        return;
      }

      if (!session?.user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/rbac/my-permissions");
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions || []);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [session, status]);

  const hasPermission = (resource: PermissionResource, action: PermissionAction): boolean => {
    return permissions.some(
      (p) => p.resource === resource && p.action === action
    );
  };

  return {
    permissions,
    loading,
    hasPermission,
  };
}

/**
 * Hook to get current user's role information
 */
export function useRole(): {
  role: string | null;
  roleId: string | null;
  roleName: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
} {
  const { data: session, status } = useSession();
  const [roleInfo, setRoleInfo] = useState<{
    role: string | null;
    roleId: string | null;
    roleName: string | null;
  }>({
    role: null,
    roleId: null,
    roleName: null,
  });

  useEffect(() => {
    if (session?.user) {
      setRoleInfo({
        role: (session.user as any).role || null,
        roleId: (session.user as any).roleId || null,
        roleName: (session.user as any).roleName || null,
      });
    }
  }, [session]);

  return {
    ...roleInfo,
    loading: status === "loading",
    isSuperAdmin: roleInfo.role === "SUPER_ADMIN",
    isAdmin: roleInfo.role === "ADMIN" || roleInfo.role === "SUPER_ADMIN",
  };
}

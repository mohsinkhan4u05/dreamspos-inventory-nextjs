"use client";

import { usePermission } from "@/hooks/usePermission";
import { PermissionAction, PermissionResource } from "@/lib/rbac/permissions";
import React from "react";

export interface CanProps {
  resource: PermissionResource;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

/**
 * Permission-based rendering component
 * Only renders children if user has the specified permission
 * 
 * @example
 * <Can resource="sales" action="create">
 *   <Button>Create Sales Order</Button>
 * </Can>
 */
export function Can({
  resource,
  action,
  children,
  fallback = null,
  loadingFallback = null,
}: CanProps) {
  const { hasPermission, loading } = usePermission(resource, action);

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Inverse permission component - renders when user DOESN'T have permission
 */
export function Cannot({
  resource,
  action,
  children,
  fallback = null,
}: Omit<CanProps, "loadingFallback">) {
  const { hasPermission, loading } = usePermission(resource, action);

  if (loading) {
    return null;
  }

  if (hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

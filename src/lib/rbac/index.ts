/**
 * RBAC System - Central Export
 * 
 * This file provides a single import point for all RBAC functionality.
 * 
 * @example
 * import { hasPermission, withPermission, auditLog } from "@/lib/rbac";
 */

// Permission utilities
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getUserPermissions,
  type Permission,
  type PermissionAction,
  type PermissionResource,
} from "./permissions";

// Middleware
export {
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  withPermission,
  type AuthenticatedUser,
} from "./middleware";

// Audit logging
export {
  createAuditLog,
  getRequestMetadata,
  auditLog,
  type AuditLogData,
} from "./audit";

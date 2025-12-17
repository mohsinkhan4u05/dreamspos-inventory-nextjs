import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface AuditLogData {
  userId?: string;
  roleId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        roleId: data.roleId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        description: data.description,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Extract IP and User Agent from request
 */
export function getRequestMetadata(request: NextRequest): {
  ipAddress?: string;
  userAgent?: string;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    undefined;

  const userAgent = request.headers.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}

/**
 * Audit log helpers for common actions
 */
export const auditLog = {
  // Role management
  roleCreated: async (userId: string, roleId: string, roleName: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      roleId,
      action: "role.created",
      resource: "role",
      resourceId: roleId,
      description: `Created role: ${roleName}`,
      ...metadata,
    });
  },

  roleUpdated: async (userId: string, roleId: string, roleName: string, changes: any, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      roleId,
      action: "role.updated",
      resource: "role",
      resourceId: roleId,
      description: `Updated role: ${roleName}`,
      metadata: { changes },
      ...metadata,
    });
  },

  roleDeleted: async (userId: string, roleId: string, roleName: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      roleId,
      action: "role.deleted",
      resource: "role",
      resourceId: roleId,
      description: `Deleted role: ${roleName}`,
      ...metadata,
    });
  },

  // Permission management
  permissionAssigned: async (userId: string, roleId: string, permission: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      roleId,
      action: "permission.assigned",
      resource: "permission",
      description: `Assigned permission: ${permission}`,
      metadata: { permission },
      ...metadata,
    });
  },

  permissionRevoked: async (userId: string, roleId: string, permission: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      roleId,
      action: "permission.revoked",
      resource: "permission",
      description: `Revoked permission: ${permission}`,
      metadata: { permission },
      ...metadata,
    });
  },

  // User management
  userRoleAssigned: async (adminId: string, targetUserId: string, roleId: string, roleName: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId: adminId,
      roleId,
      action: "user.role_assigned",
      resource: "user",
      resourceId: targetUserId,
      description: `Assigned role ${roleName} to user`,
      metadata: { targetUserId, roleId, roleName },
      ...metadata,
    });
  },

  userActivated: async (adminId: string, targetUserId: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId: adminId,
      action: "user.activated",
      resource: "user",
      resourceId: targetUserId,
      description: "Activated user",
      ...metadata,
    });
  },

  userDeactivated: async (adminId: string, targetUserId: string, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId: adminId,
      action: "user.deactivated",
      resource: "user",
      resourceId: targetUserId,
      description: "Deactivated user",
      ...metadata,
    });
  },

  // Inventory management
  inventoryAdjusted: async (userId: string, productId: string, adjustment: any, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      action: "inventory.adjusted",
      resource: "inventory",
      resourceId: productId,
      description: `Adjusted inventory for product ${productId}`,
      metadata: { adjustment },
      ...metadata,
    });
  },

  // Payment management
  paymentRecorded: async (userId: string, paymentId: string, amount: number, request?: NextRequest) => {
    const metadata = request ? getRequestMetadata(request) : {};
    await createAuditLog({
      userId,
      action: "payment.recorded",
      resource: "payment",
      resourceId: paymentId,
      description: `Recorded payment of ${amount}`,
      metadata: { amount },
      ...metadata,
    });
  },

  // Generic action
  custom: async (data: AuditLogData) => {
    await createAuditLog(data);
  },
};

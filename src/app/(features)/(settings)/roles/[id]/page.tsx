"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Role } from "@/types/rbac";
import { Can } from "@/components/rbac/Can";
import {
  getResourceDisplayName,
  getActionDisplayName,
} from "@/types/rbac";

/**
 * View Role Details Page
 */
export default function ViewRolePage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      try {
        setLoading(true);
        const response = await fetch(`/api/rbac/roles/${roleId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch role");
        }

        const data = await response.json();
        setRole(data.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load role");
      } finally {
        setLoading(false);
      }
    }

    if (roleId) {
      fetchRole();
    }
  }, [roleId]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading role...</p>
        </div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <p className="error-message">
            Error: {error || "Role not found"}
          </p>
          <button onClick={() => router.back()} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Group permissions by resource
  const permissionsByResource: Record<string, string[]> = {};
  role.rolePermissions?.forEach((rp) => {
    const resource = rp.permission.resource;
    if (!permissionsByResource[resource]) {
      permissionsByResource[resource] = [];
    }
    permissionsByResource[resource].push(rp.permission.action);
  });

  return (
    <div className="page-wrapper">
      <div className="role-view-page">
        {/* HEADER */}
        <div className="page-header">
          <div className="header-content">
            <div className="title-row">
              <h1 className="page-title">{role.displayName}</h1>

              {role.isSystemRole && (
                <span className="badge badge-system">System Role</span>
              )}

              <span
                className={`status ${
                  role.isActive ? "status-active" : "status-inactive"
                }`}
              >
                {role.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {role.description && (
              <p className="page-description">{role.description}</p>
            )}
          </div>

          <div className="header-actions">
            {!role.isSystemRole && (
              <Can resource="roles" action="update">
                <Link
                  href={`/roles/${role.id}/edit`}
                  className="btn btn-primary"
                >
                  Edit Role
                </Link>
              </Can>
            )}

            <button
              onClick={() => router.back()}
              className="btn btn-secondary"
            >
              Back
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content-grid">
          {/* Role Information */}
          <div className="card">
            <h2 className="card-title">Role Information</h2>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Role Name</span>
                <span className="info-value">{role.name}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Display Name</span>
                <span className="info-value">{role.displayName}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Type</span>
                <span className="info-value">
                  {role.isSystemRole ? "System Role" : "Custom Role"}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Assigned Users</span>
                <span className="info-value">
                  {role._count?.users || 0}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">
                  {new Date(role.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Last Updated</span>
                <span className="info-value">
                  {new Date(role.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="card">
            <h2 className="card-title">
              Permissions ({role.rolePermissions?.length || 0})
            </h2>

            <div className="permissions-grid">
              {Object.entries(permissionsByResource).map(
                ([resource, actions]) => (
                  <div key={resource} className="permission-group">
                    <h3 className="resource-name">
                      {getResourceDisplayName(resource)}
                    </h3>

                    <div className="actions-list">
                      {actions.sort().map((action) => (
                        <span key={action} className="action-badge">
                          {getActionDisplayName(action)}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {(!role.rolePermissions ||
              role.rolePermissions.length === 0) && (
              <p className="empty-message">
                No permissions assigned
              </p>
            )}
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .role-view-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-content {
          flex: 1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .page-description {
          font-size: 14px;
          color: #6b7280;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
        }

        .btn-primary {
          background: #6366f1;
          color: #fff;
        }

        .btn-secondary {
          background: #fff;
          border: 1px solid #d1d5db;
        }

        .badge-system {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 12px;
          border-radius: 4px;
        }

        .status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .content-grid {
          display: grid;
          gap: 24px;
        }

        .card {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .permissions-grid {
          display: grid;
          gap: 16px;
        }

        .permission-group {
          background: #f9fafb;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .actions-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-badge {
          padding: 4px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }

        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

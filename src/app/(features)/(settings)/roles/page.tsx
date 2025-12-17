"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Role } from "@/types/rbac";
import { Can } from "@/components/rbac/Can";

/**
 * Role Management List Page
 */
export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      setLoading(true);
      const response = await fetch("/api/rbac/roles");
      
      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(roleId: string) {
    if (deleteConfirm !== roleId) {
      setDeleteConfirm(roleId);
      return;
    }

    try {
      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete role");
      }

      // Refresh list
      fetchRoles();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete role");
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <p className="error-message">Error: {error}</p>
          <button onClick={fetchRoles} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Role Management</h1>
          <p className="page-description">
            Manage roles and permissions for your organization
          </p>
        </div>
        <Can resource="roles" action="create">
          <Link href="/roles/create" className="btn btn-primary">
            <span className="icon">+</span>
            Create New Role
          </Link>
        </Can>
      </div>

      <div className="roles-container">
        <div className="table-container">
          <table className="roles-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Description</th>
                <th>Type</th>
                <th>Users</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <div className="role-name">
                      <span className="name">{role.displayName}</span>
                      {role.isSystemRole && (
                        <span className="badge badge-system">System</span>
                      )}
                    </div>
                  </td>
                  <td className="description">
                    {role.description || "—"}
                  </td>
                  <td>
                    {role.isSystemRole ? (
                      <span className="badge badge-system">System Role</span>
                    ) : (
                      <span className="badge badge-custom">Custom Role</span>
                    )}
                  </td>
                  <td className="user-count">
                    {role._count?.users || 0}
                  </td>
                  <td>
                    {role.isActive ? (
                      <span className="status status-active">Active</span>
                    ) : (
                      <span className="status status-inactive">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="actions">
                      <Can resource="roles" action="read">
                        <Link
                          href={`/roles/${role.id}`}
                          className="btn-action btn-view"
                          title="View"
                        >
                          👁️
                        </Link>
                      </Can>

                      {!role.isSystemRole && (
                        <>
                          <Can resource="roles" action="update">
                            <Link
                              href={`/roles/${role.id}/edit`}
                              className="btn-action btn-edit"
                              title="Edit"
                            >
                              ✏️
                            </Link>
                          </Can>

                          <Can resource="roles" action="delete">
                            <button
                              onClick={() => handleDelete(role.id)}
                              className={`btn-action btn-delete ${
                                deleteConfirm === role.id ? "confirm" : ""
                              }`}
                              disabled={role._count && role._count.users > 0}
                              title={
                                role._count && role._count.users > 0
                                  ? "Cannot delete role with assigned users"
                                  : deleteConfirm === role.id
                                  ? "Click again to confirm"
                                  : "Delete"
                              }
                            >
                              {deleteConfirm === role.id ? "⚠️" : "🗑️"}
                            </button>
                          </Can>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {roles.length === 0 && (
            <div className="empty-state">
              <p>No roles found</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .page-wrapper {
          padding: 24px;
          max-width: 1400px;
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

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .page-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover {
          background: #4f46e5;
        }

        .icon {
          font-size: 18px;
        }

        .roles-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        .roles-table {
          width: 100%;
          border-collapse: collapse;
        }

        .roles-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .roles-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .roles-table td {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #111827;
        }

        .roles-table tbody tr:hover {
          background: #f9fafb;
        }

        .role-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-name .name {
          font-weight: 600;
        }

        .description {
          color: #6b7280;
          max-width: 300px;
        }

        .user-count {
          font-weight: 600;
          color: #6366f1;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-system {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fbbf24;
        }

        .badge-custom {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #60a5fa;
        }

        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-block;
        }

        .btn-action:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .btn-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-delete.confirm {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          color: #6b7280;
        }

        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          text-align: center;
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
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
}

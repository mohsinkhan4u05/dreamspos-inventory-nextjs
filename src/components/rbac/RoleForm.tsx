"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RolePermissionMatrix } from "./RolePermissionMatrix";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Role, Permission } from "@/types/rbac";

export interface RoleFormProps {
  role?: Role;
  mode: "create" | "edit";
}

/**
 * Role Create/Edit Form with Permission Matrix
 */
export function RoleForm({ role, mode }: RoleFormProps) {
  const router = useRouter();
  const [roleName, setRoleName] = useState(role?.name || "");
  const [displayName, setDisplayName] = useState(role?.displayName || "");
  const [description, setDescription] = useState(role?.description || "");
  const [isActive, setIsActive] = useState(role?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get initial permissions if editing
  const initialPermissions: Permission[] = role?.rolePermissions
    ? role.rolePermissions.map((rp) => rp.permission)
    : [];

  const {
    matrix,
    loading: permissionsLoading,
    error: permissionsError,
    togglePermission,
    toggleColumn,
    isColumnSelected,
    getPermissionIds,
    validate,
  } = useRolePermissions(initialPermissions);

  // Update form when role changes
  useEffect(() => {
    if (role) {
      setRoleName(role.name);
      setDisplayName(role.displayName);
      setDescription(role.description || "");
      setIsActive(role.isActive);
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    if (mode === "create" && !roleName.trim()) {
      setError("Role name is required");
      return;
    }

    // Validate permissions
    const validation = validate();
    if (!validation.valid) {
      setError(validation.errors.join(", "));
      return;
    }

    try {
      setSaving(true);

      const permissionIds = getPermissionIds();
      const payload = {
        name: roleName.trim().toUpperCase().replace(/\s+/g, "_"),
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        isActive,
        permissionIds,
      };

      const url = mode === "create" 
        ? "/api/rbac/roles"
        : `/api/rbac/roles/${role?.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save role");
      }

      // Success - redirect to roles list (actual path is /roles)
      router.push("/roles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const isSystemRole = role?.isSystemRole || false;

  if (permissionsLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading permissions...</p>
      </div>
    );
  }

  if (permissionsError) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {permissionsError}</p>
      </div>
    );
  }

  return (
    <div className="role-form-container">
      <form onSubmit={handleSubmit} className="role-form">
        {/* Form Header */}
        <div className="form-header">
          <h2 className="form-title">
            {mode === "create" ? "Create New Role" : `Edit Role: ${role?.displayName}`}
          </h2>
          {isSystemRole && (
            <div className="system-role-badge">
              <span>System Role</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="form-section">
          <h3 className="section-title">Basic Information</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="displayName" className="form-label required">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Sales Executive"
                required
                disabled={isSystemRole}
              />
            </div>

            {mode === "create" && (
              <div className="form-group">
                <label htmlFor="roleName" className="form-label required">
                  Role Name (Internal)
                </label>
                <input
                  id="roleName"
                  type="text"
                  className="form-input"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g., SALES_EXECUTIVE"
                  required
                />
                <p className="form-hint">
                  Will be converted to uppercase with underscores
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role and its responsibilities"
              rows={3}
              disabled={isSystemRole}
            />
          </div>

          {mode === "edit" && !isSystemRole && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active</span>
              </label>
              <p className="form-hint">
                Inactive roles cannot be assigned to users
              </p>
            </div>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="form-section">
          <h3 className="section-title">Permissions</h3>
          <p className="section-description">
            Select the permissions for this role. Read permission is required for all other actions.
          </p>

          <RolePermissionMatrix
            matrix={matrix}
            onTogglePermission={togglePermission}
            onToggleColumn={toggleColumn}
            isColumnSelected={isColumnSelected}
            disabled={isSystemRole}
            disabledTooltip="System role permissions cannot be modified"
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || isSystemRole}
          >
            {saving ? "Saving..." : mode === "create" ? "Create Role" : "Save Changes"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .role-form-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .role-form {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-title {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .system-role-badge {
          padding: 6px 12px;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #92400e;
        }

        .alert {
          margin: 16px 24px;
          padding: 12px 16px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .alert-icon {
          font-size: 18px;
        }

        .form-section {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .section-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-label.required:after {
          content: " *";
          color: #ef4444;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-input:disabled,
        .form-textarea:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }

        .form-hint {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 0 0 8px 8px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
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
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

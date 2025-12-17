"use client";

import React from "react";
import { PermissionCheckboxCell } from "./PermissionCheckboxCell";
import { MODULE_CONFIGS, getActionDisplayName } from "@/types/rbac";
import { PermissionMatrix } from "@/types/rbac";

export interface RolePermissionMatrixProps {
  matrix: PermissionMatrix;
  onTogglePermission: (resource: string, action: string) => void;
  onToggleColumn: (action: string, resources: string[]) => void;
  isColumnSelected: (action: string, resources: string[]) => boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}

/**
 * Zoho-style Permission Matrix Component
 */
export function RolePermissionMatrix({
  matrix,
  onTogglePermission,
  onToggleColumn,
  isColumnSelected,
  disabled = false,
  disabledTooltip,
}: RolePermissionMatrixProps) {
  // Get all unique actions across all modules
  const allActions = Array.from(
    new Set(MODULE_CONFIGS.flatMap((m) => m.actions))
  );

  // Get all resources
  const allResources = MODULE_CONFIGS.map((m) => m.resource);

  return (
    <div className="permission-matrix-wrapper">
      <div className="permission-matrix-container">
        <table className="permission-matrix-table">
          <thead>
            <tr>
              <th className="module-header sticky-column">Module</th>
              {allActions.map((action) => (
                <th key={action} className="action-header">
                  <div className="action-header-content">
                    <label className="column-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={isColumnSelected(action, allResources)}
                        disabled={disabled}
                        onChange={() => onToggleColumn(action, allResources)}
                        title={`Select all ${getActionDisplayName(action)}`}
                      />
                      <span className="checkmark-small"></span>
                    </label>
                    <span className="action-label">
                      {getActionDisplayName(action)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_CONFIGS.map((module) => (
              <tr key={module.resource} className="module-row">
                <td className="module-name sticky-column">
                  {module.displayName}
                </td>
                {allActions.map((action) => {
                  const hasAction = module.actions.includes(action);
                  const isChecked = matrix[module.resource]?.[action] || false;

                  return (
                    <td key={`${module.resource}-${action}`} className="permission-cell">
                      {hasAction ? (
                        <PermissionCheckboxCell
                          resource={module.resource}
                          action={action}
                          checked={isChecked}
                          disabled={disabled}
                          matrix={matrix}
                          onChange={onTogglePermission}
                          tooltip={disabledTooltip}
                        />
                      ) : (
                        <div className="empty-cell">—</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .permission-matrix-wrapper {
          width: 100%;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
        }

        .permission-matrix-container {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 600px;
        }

        .permission-matrix-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 14px;
        }

        .permission-matrix-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f9fafb;
        }

        .permission-matrix-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }

        .module-header {
          min-width: 180px;
          font-weight: 700;
          color: #111827;
        }

        .sticky-column {
          position: sticky;
          left: 0;
          z-index: 5;
          background: white;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
        }

        thead .sticky-column {
          background: #f9fafb;
          z-index: 15;
        }

        .action-header {
          min-width: 100px;
          text-align: center;
        }

        .action-header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .column-checkbox-wrapper {
          position: relative;
          display: inline-block;
          cursor: pointer;
        }

        .column-checkbox-wrapper input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }

        .checkmark-small {
          display: inline-block;
          height: 16px;
          width: 16px;
          background-color: #fff;
          border: 2px solid #d1d5db;
          border-radius: 3px;
          transition: all 0.2s ease;
        }

        .column-checkbox-wrapper:hover .checkmark-small {
          border-color: #6366f1;
        }

        .column-checkbox-wrapper input[type="checkbox"]:checked ~ .checkmark-small {
          background-color: #6366f1;
          border-color: #6366f1;
        }

        .column-checkbox-wrapper input[type="checkbox"]:checked ~ .checkmark-small:after {
          content: "";
          position: absolute;
          display: block;
          left: 5px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .column-checkbox-wrapper input[type="checkbox"]:disabled ~ .checkmark-small {
          background-color: #f3f4f6;
          border-color: #e5e7eb;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .action-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .module-row {
          transition: background-color 0.15s ease;
        }

        .module-row:hover {
          background-color: #f9fafb;
        }

        .module-row:nth-child(even) {
          background-color: #fafafa;
        }

        .module-row:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .module-name {
          padding: 12px 16px;
          font-weight: 600;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
        }

        .permission-cell {
          padding: 0;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
          border-left: 1px solid #f3f4f6;
        }

        .empty-cell {
          padding: 12px;
          color: #d1d5db;
          font-size: 16px;
        }

        /* Scrollbar styling */
        .permission-matrix-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .permission-matrix-container::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .permission-matrix-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .permission-matrix-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  );
}

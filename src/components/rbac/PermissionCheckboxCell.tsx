"use client";

import React from "react";
import { shouldEnableAction } from "@/lib/rbac/matrix-utils";
import { PermissionMatrix } from "@/types/rbac";

export interface PermissionCheckboxCellProps {
  resource: string;
  action: string;
  checked: boolean;
  disabled?: boolean;
  matrix: PermissionMatrix;
  onChange: (resource: string, action: string) => void;
  tooltip?: string;
}

/**
 * Individual permission checkbox cell with Zoho-style behavior
 */
export function PermissionCheckboxCell({
  resource,
  action,
  checked,
  disabled = false,
  matrix,
  onChange,
  tooltip,
}: PermissionCheckboxCellProps) {
  // Check if this action should be enabled based on dependencies
  const isEnabled = shouldEnableAction(matrix, resource, action);
  const isDisabled = disabled || (action !== "read" && !isEnabled);

  // Generate tooltip
  const getTooltip = () => {
    if (tooltip) return tooltip;
    if (disabled) return "System role permissions cannot be modified";
    if (action !== "read" && !isEnabled) {
      return "Enable Read permission first";
    }
    return `${action.charAt(0).toUpperCase() + action.slice(1)} permission for ${resource}`;
  };

  return (
    <div className="permission-checkbox-cell" title={getTooltip()}>
      <label className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={checked}
          disabled={isDisabled}
          onChange={() => onChange(resource, action)}
          className={`permission-checkbox ${isDisabled ? "disabled" : ""}`}
        />
        <span className="checkmark"></span>
      </label>

      <style jsx>{`
        .permission-checkbox-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          min-height: 40px;
        }

        .checkbox-wrapper {
          position: relative;
          display: inline-block;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-wrapper input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }

        .checkmark {
          position: relative;
          display: inline-block;
          height: 20px;
          width: 20px;
          background-color: #fff;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .checkbox-wrapper:hover .checkmark {
          border-color: #6366f1;
        }

        .checkbox-wrapper input[type="checkbox"]:checked ~ .checkmark {
          background-color: #6366f1;
          border-color: #6366f1;
        }

        .checkbox-wrapper input[type="checkbox"]:checked ~ .checkmark:after {
          content: "";
          position: absolute;
          display: block;
          left: 6px;
          top: 2px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-wrapper input[type="checkbox"]:disabled ~ .checkmark {
          background-color: #f3f4f6;
          border-color: #e5e7eb;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .checkbox-wrapper input[type="checkbox"]:disabled {
          cursor: not-allowed;
        }

        .checkbox-wrapper input[type="checkbox"]:disabled ~ .checkmark:after {
          border-color: #9ca3af;
        }

        .permission-checkbox.disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

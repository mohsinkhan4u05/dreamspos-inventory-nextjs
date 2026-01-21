"use client";

import { RoleForm } from "@/components/rbac/RoleForm";

/**
 * Create New Role Page
 */
export default function CreateRolePage() {
  return (
    <div className="page-wrapper">
      <RoleForm mode="create" />
    </div>
  );
}

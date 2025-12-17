"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RoleForm } from "@/components/rbac/RoleForm";
import { Role } from "@/types/rbac";

/**
 * Edit Role Page
 */
export default function EditRolePage() {
  const params = useParams();
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
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading role...</p>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error || "Role not found"}</p>
      </div>
    );
  }

  return <RoleForm role={role} mode="edit" />;
}

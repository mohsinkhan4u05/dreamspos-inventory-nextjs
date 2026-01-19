"use client";

import { Fragment, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { InviteUserModal } from "@/components/user-management/InviteUserModal";
import { UpdatePasswordModal } from "@/components/user-management/UpdatePasswordModal";
import { Can } from "@/components/rbac/Can";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF" | "CASHIER";

type Viewport = "desktop" | "tablet" | "mobile";

interface CustomRole {
  id: string;
  name: string;
  displayName: string;
  isSystemRole: boolean;
}

interface UserRow {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  isActive: boolean;
  role: UserRole;
  roleId: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customRole: CustomRole | null;
}

interface PendingInvitationRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: string;
  createdAt: string;
  expiresAt: string;
  role: {
    id: string;
    name: string;
    displayName: string;
  };
  invitedBy: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface UsersApiResponse {
  users: UserRow[];
  pendingInvitations: PendingInvitationRow[];
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<UsersApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setViewport("mobile");
      } else if (width < 1024) {
        setViewport("tablet");
      } else {
        setViewport("desktop");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch users");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(user: UserRow) {
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update status");
      }
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleResendInvitation(invitation: PendingInvitationRow) {
    try {
      const res = await fetch("/api/users/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to resend invitation");
      }
      alert("Invitation resent successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resend invitation");
    }
  }

  async function handleRemoveUser(user: UserRow) {
    if (!confirm("Are you sure you want to remove this user?")) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to remove user");
      }
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove user");
    }
  }

  function handleUpdatePassword(user: UserRow) {
    setSelectedUser(user);
    setPasswordModalOpen(true);
  }

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const isRowExpanded = (rowId: string) => expandedRows.includes(rowId);

  const renderStatusBadge = (status: UserRow["status"]) => (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status}
    </span>
  );

  const renderUserActions = (user: UserRow) => (
    <div className="actions">
      {isSuperAdmin && (
        <button
          className="btn-link"
          onClick={() => handleUpdatePassword(user)}
          title="Update Password"
        >
          🔑 Password
        </button>
      )}
      <Can resource="users" action="update">
        <button
          className="btn-link"
          onClick={() => handleToggleStatus(user)}
        >
          {user.isActive ? "Deactivate" : "Activate"}
        </button>
      </Can>
      <Can resource="users" action="delete">
        <button
          className="btn-link text-danger"
          onClick={() => handleRemoveUser(user)}
        >
          Remove
        </button>
      </Can>
    </div>
  );

  const users = data?.users ?? [];
  const invitations = data?.pendingInvitations ?? [];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h3 className="page-title">Users</h3>
          <p className="page-subtitle">Manage users, roles, and invitations.</p>
        </div>
        <Can resource="users" action="create">
          <button
            className="btn btn-primary"
            onClick={() => setInviteOpen(true)}
          >
            + Invite User
          </button>
        </Can>
      </div>

      {loading && <div className="card">Loading users...</div>}
      {error && !loading && (
        <div className="card error-card">{error}</div>
      )}

      {!loading && !error && (
        <div className="card">
          <table className="table users-table">
            <thead>
              <tr>
                <th>USER DETAILS</th>
                {viewport === "desktop" && <th>ROLE</th>}
                <th>STATUS</th>
                {viewport === "desktop" ? (
                  <th style={{ width: 160 }}>ACTIONS</th>
                ) : (
                  <th aria-label="Row details" />
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const rowId = `user-${user.id}`;
                const expanded = isRowExpanded(rowId);
                return (
                  <Fragment key={rowId}>
                    <tr>
                      <td>
                        <div className="user-cell">
                          <div className="avatar">
                            {user.firstName?.[0] || user.email[0].toUpperCase()}
                          </div>
                          <div className="user-meta">
                            <div className="user-name">
                              {user.firstName || user.lastName ? (
                                <>
                                  {user.firstName} {user.lastName}
                                </>
                              ) : (
                                user.email
                              )}
                            </div>
                            <div className="user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {viewport === "desktop" && (
                        <td>{user.customRole?.displayName || user.role}</td>
                      )}
                      <td>{renderStatusBadge(user.status)}</td>
                      {viewport === "desktop" ? (
                        <td>{renderUserActions(user)}</td>
                      ) : (
                        <td className="details-toggle-cell">
                          <button
                            type="button"
                            className="table-row-expand-btn"
                            aria-label={
                              expanded
                                ? "Collapse user details"
                                : "Expand user details"
                            }
                            aria-expanded={expanded}
                            onClick={() => toggleRowExpanded(rowId)}
                          >
                            <i className={`ti ${expanded ? "ti-minus" : "ti-plus"}`} />
                          </button>
                        </td>
                      )}
                    </tr>
                    {viewport !== "desktop" && expanded && (
                      <tr className="details-row">
                        <td colSpan={3}>
                          <div className="responsive-row-details">
                            <div className="responsive-row-detail-item">
                              <div className="responsive-row-detail-label">Role</div>
                              <div className="responsive-row-detail-value">
                                {user.customRole?.displayName || user.role}
                              </div>
                            </div>
                            <div className="responsive-row-detail-item">
                              <div className="responsive-row-detail-label">Status</div>
                              <div className="responsive-row-detail-value">
                                {renderStatusBadge(user.status)}
                              </div>
                            </div>
                            <div className="responsive-row-detail-item">
                              <div className="responsive-row-detail-label">Actions</div>
                              <div className="responsive-row-detail-value">
                                {renderUserActions(user)}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {invitations.map((inv) => {
                const rowId = `inv-${inv.id}`;
                const expanded = isRowExpanded(rowId);
                return (
                  <Fragment key={rowId}>
                    <tr className="pending-row">
                      <td>
                        <div className="user-cell">
                          <div className="avatar avatar-pending">?</div>
                          <div className="user-meta">
                            <div className="user-name">
                              {inv.firstName || inv.email}
                            </div>
                            <div className="user-email">{inv.email}</div>
                          </div>
                        </div>
                      </td>
                      {viewport === "desktop" && <td>{inv.role.displayName}</td>}
                      <td>
                        <span className="status-badge status-pending">PENDING</span>
                      </td>
                      {viewport === "desktop" ? (
                        <td>
                          <Can resource="users" action="create">
                            <button
                              className="btn-link"
                              onClick={() => handleResendInvitation(inv)}
                            >
                              Resend Invite
                            </button>
                          </Can>
                        </td>
                      ) : (
                        <td className="details-toggle-cell">
                          <button
                            type="button"
                            className="table-row-expand-btn"
                            aria-label={
                              expanded
                                ? "Collapse invitation details"
                                : "Expand invitation details"
                            }
                            aria-expanded={expanded}
                            onClick={() => toggleRowExpanded(rowId)}
                          >
                            <i className={`ti ${expanded ? "ti-minus" : "ti-plus"}`} />
                          </button>
                        </td>
                      )}
                    </tr>
                    {viewport !== "desktop" && expanded && (
                      <tr className="pending-row details-row">
                        <td colSpan={3}>
                          <div className="responsive-row-details">
                            <div className="responsive-row-detail-item">
                              <div className="responsive-row-detail-label">Role</div>
                              <div className="responsive-row-detail-value">
                                {inv.role.displayName}
                              </div>
                            </div>
                            <div className="responsive-row-detail-item">
                              <div className="responsive-row-detail-label">Actions</div>
                              <div className="responsive-row-detail-value">
                                <Can resource="users" action="create">
                                  <button
                                    className="btn-link"
                                    onClick={() => handleResendInvitation(inv)}
                                  >
                                    Resend Invite
                                  </button>
                                </Can>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {users.length === 0 && invitations.length === 0 && (
                <tr>
                  <td
                    colSpan={viewport === "desktop" ? 4 : 3}
                    style={{ textAlign: "center", padding: "24px" }}
                  >
                    No users or invitations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <InviteUserModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={fetchUsers}
      />

      {selectedUser && (
        <UpdatePasswordModal
          isOpen={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            alert("Password updated successfully");
            fetchUsers();
          }}
          user={{
            id: selectedUser.id,
            email: selectedUser.email,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
          }}
        />
      )}

      <style jsx>{`
        .page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .page-subtitle {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }
        .card {
          background: #ffffff;
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }
        .error-card {
          border: 1px solid #fecaca;
          color: #991b1b;
          background: #fef2f2;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        .table th,
        .table td {
          padding: 12px 10px;
          font-size: 13px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }
        .table thead th {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        .avatar-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .user-meta {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-size: 14px;
          font-weight: 500;
        }
        .user-email {
          font-size: 12px;
          color: #6b7280;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-active {
          background: #ecfdf3;
          color: #166534;
        }
        .status-inactive {
          background: #f3f4f6;
          color: #4b5563;
        }
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .actions {
          display: flex;
          gap: 6px;
        }
        .btn {
          border-radius: 6px;
          border: none;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-link {
          border: none;
          background: transparent;
          font-size: 12px;
          color: #2563eb;
          cursor: pointer;
          padding: 0;
        }
        .btn-link.text-danger {
          color: #b91c1c;
        }
        .pending-row {
          background: #f9fafb;
        }
        .details-row td {
          padding-top: 0;
        }
        .details-toggle-cell {
          text-align: right;
          width: 40px;
        }
      `}</style>
    </div>
  );
}

# User Management Module - Implementation Guide

## ✅ Completed Components

### 1. Database Schema (`prisma/schema.prisma`)
- ✅ Extended `User` model with invitation fields (`status`, `invitedAt`, `joinedAt`)
- ✅ Added `UserStatus` enum (PENDING, ACTIVE, INACTIVE)
- ✅ Created `UserInvitation` model with all required fields
- ✅ Added `InvitationStatus` enum (PENDING, ACCEPTED, EXPIRED, REVOKED)
- ✅ Established relations between User, UserInvitation, and Role

### 2. Utilities & Services
- ✅ `src/lib/invitation-token.ts` - Token generation and validation
- ✅ `src/lib/email/invitation-template.ts` - Zoho-style email templates
- ✅ `src/lib/email/send-email.ts` - Email sending utility (placeholder)

### 3. API Endpoints
- ✅ `POST /api/users/invite` - Send invitation
- ✅ `POST /api/users/invite/accept` - Accept invitation
- ✅ `POST /api/users/invite/reject` - Reject invitation
- ✅ `POST /api/users/invite/resend` - Resend invitation
- ✅ `GET /api/users` - List all users + pending invitations
- ✅ `PATCH /api/users/[id]/status` - Update user status
- ✅ `DELETE /api/users/[id]` - Soft delete user

### 4. UI Components
- ✅ `src/components/user-management/InviteUserModal.tsx` - Invite modal
- ✅ `src/types/user-management.ts` - TypeScript types

## 🚧 Remaining Tasks

### 1. Run Prisma Migration
```bash
npx prisma migrate dev --name add_user_invitations
npx prisma generate
```

### 2. Create Remaining UI Components

#### Users List Page (`src/app/(features)/(settings)/users/page.tsx`)
```typescript
"use client";

import { useState, useEffect } from "react";
import { InviteUserModal } from "@/components/user-management/InviteUserModal";
import { Can } from "@/components/rbac/Can";
import { UserWithRole, PendingInvitation } from "@/types/user-management";

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPendingInvitations(data.pendingInvitations || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(userId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  }

  async function handleResendInvite(invitationId: string) {
    try {
      const response = await fetch("/api/users/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (response.ok) {
        alert("Invitation resent successfully");
      }
    } catch (error) {
      console.error("Failed to resend invitation:", error);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to remove this user?")) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>All Users</h1>
        <Can resource="users" action="create">
          <button
            className="btn btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            + Invite User
          </button>
        </Can>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>USER DETAILS</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="avatar">
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="user-name">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>{user.customRole?.displayName || user.role}</td>
                <td>
                  <span className={`status-badge status-${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <Can resource="users" action="update">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.isActive)}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </Can>
                  <Can resource="users" action="delete">
                    <button onClick={() => handleDeleteUser(user.id)}>
                      Remove
                    </button>
                  </Can>
                </td>
              </tr>
            ))}

            {/* Pending Invitations */}
            {pendingInvitations.map((inv) => (
              <tr key={inv.id} className="pending-invitation">
                <td>
                  <div className="user-info">
                    <div className="avatar pending">?</div>
                    <div>
                      <div className="user-name">
                        {inv.firstName || inv.email}
                      </div>
                      <div className="user-email">{inv.email}</div>
                    </div>
                  </div>
                </td>
                <td>{inv.role.displayName}</td>
                <td>
                  <span className="status-badge status-pending">PENDING</span>
                </td>
                <td>
                  <Can resource="users" action="create">
                    <button onClick={() => handleResendInvite(inv.id)}>
                      Resend Invite
                    </button>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
```

#### Invitation Acceptance Page (`src/app/invite/accept/page.tsx`)
```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError("Invalid invitation link");
      setLoading(false);
    }
  }, [token]);

  async function validateToken() {
    try {
      const response = await fetch(`/api/users/invite/validate?token=${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setInvitation(data.invitation);
        setFormData({
          ...formData,
          firstName: data.invitation.firstName || "",
          lastName: data.invitation.lastName || "",
        });
      } else {
        setError(data.error || "Invalid or expired invitation");
      }
    } catch (err) {
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const response = await fetch("/api/users/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Account created successfully! Please sign in.");
        router.push("/auth/signin");
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      setError("Failed to accept invitation");
    }
  }

  async function handleReject() {
    if (!confirm("Are you sure you want to reject this invitation?")) return;

    try {
      await fetch("/api/users/invite/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      alert("Invitation rejected");
      router.push("/");
    } catch (err) {
      setError("Failed to reject invitation");
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="accept-invitation-page">
      <div className="card">
        <h1>Accept Invitation</h1>
        <p>You've been invited to join as {invitation?.role.displayName}</p>

        <form onSubmit={handleAccept}>
          <div className="form-group">
            <label>Email (readonly)</label>
            <input type="email" value={invitation?.email} disabled />
          </div>

          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Accept Invitation
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReject}>
              Reject Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3. Add RBAC Permissions
Add these permissions to your permissions seed/migration:
```typescript
{
  resource: "users",
  actions: ["create", "read", "update", "delete"]
}
```

### 4. Update Environment Variables
Add to `.env`:
```
ORGANIZATION_NAME="DreamsPOS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email Configuration (choose one)
# Option 1: SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@dreamspos.com"

# Option 2: SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
```

### 5. Configure Email Service
Update `src/lib/email/send-email.ts` with your actual email provider (Nodemailer, SendGrid, AWS SES, etc.)

## 🔒 Security Notes

1. **Token Security**: Tokens are 64-character cryptographically secure random strings
2. **Expiry**: Invitations expire after 25 days
3. **Single-use**: Tokens can only be used once
4. **RBAC Protection**: All endpoints are protected by permission middleware
5. **Soft Delete**: Users are deactivated, not permanently deleted

## 📝 Testing Checklist

- [ ] Run Prisma migration
- [ ] Test invitation flow (invite → email → accept)
- [ ] Test invitation rejection
- [ ] Test invitation resend
- [ ] Test user activation/deactivation
- [ ] Test user deletion
- [ ] Test RBAC permissions (SUPER_ADMIN vs ADMIN vs other roles)
- [ ] Test edge cases (expired tokens, duplicate emails, etc.)

## 🎨 UI Styling

The components use scoped CSS-in-JS. You can:
1. Keep the inline styles for simplicity
2. Extract to CSS modules
3. Integrate with your existing Tailwind/CSS framework

## 🚀 Deployment

1. Ensure database migrations are run in production
2. Configure email service credentials
3. Set proper NEXT_PUBLIC_APP_URL for production
4. Test invitation emails in production environment

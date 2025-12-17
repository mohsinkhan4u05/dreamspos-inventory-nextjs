"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface InvitationMeta {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: {
    displayName: string;
  };
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationMeta | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token");
      setLoading(false);
      return;
    }
    validateToken(token);
  }, [token]);

  async function validateToken(inviteToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/invite/validate?token=${encodeURIComponent(inviteToken)}`);
      const json = await res.json();
      if (!res.ok || !json.valid) {
        throw new Error(json.error || "Invalid or expired invitation");
      }
      setInvitation(json.invitation);
      setFirstName(json.invitation.firstName || "");
      setLastName(json.invitation.lastName || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired invitation");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/users/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          firstName,
          lastName,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to accept invitation");
      }
      alert("Account created successfully. Please sign in.");
      router.push("/auth/signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!token) return;
    if (!confirm("Are you sure you want to reject this invitation?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/users/invite/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to reject invitation");
      }
      alert("Invitation rejected.");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject invitation");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="invite-page">
        <div className="card">Validating invitation...</div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="invite-page">
        <div className="card error-card">
          <h2>Invitation Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="card">
        <h1 className="title">Accept Invitation</h1>
        {invitation && (
          <p className="subtitle">
            You have been invited to join as <strong>{invitation.role.displayName}</strong>.
          </p>
        )}

        {error && (
          <div className="error-banner">{error}</div>
        )}

        <form onSubmit={handleAccept} className="form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={invitation?.email || ""}
              disabled
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password"
              required
            />
            <small>Minimum 8 characters.</small>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Accept Invitation"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReject}
              disabled={submitting}
            >
              Reject Invitation
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .invite-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          padding: 24px;
        }
        .card {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 12px;
          padding: 24px 24px 28px;
          box-shadow: 0 10px 40px rgba(15,23,42,0.12);
        }
        .error-card {
          border: 1px solid #fecaca;
          color: #991b1b;
          background: #fef2f2;
        }
        .title {
          margin: 0 0 4px;
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }
        .subtitle {
          margin: 0 0 20px;
          font-size: 14px;
          color: #4b5563;
        }
        .error-banner {
          margin-bottom: 16px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 13px;
        }
        .form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-row {
          display: flex;
          gap: 12px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 4px;
        }
        label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        input {
          border-radius: 8px;
          border: 1px solid #d1d5db;
          padding: 9px 11px;
          font-size: 14px;
        }
        input:disabled {
          background: #f9fafb;
          color: #6b7280;
        }
        input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
        small {
          font-size: 11px;
          color: #6b7280;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }
        .btn {
          border-radius: 8px;
          border: none;
          padding: 9px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-primary {
          background: #2563eb;
          color: #ffffff;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .form-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

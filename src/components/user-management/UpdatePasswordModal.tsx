"use client";

import { useState } from "react";

interface UpdatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function UpdatePasswordModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UpdatePasswordModalProps) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const resetForm = () => {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
    setExpiresAt(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/users/${user.id}/password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to send OTP");
      }

      setSuccess(json.message);
      setExpiresAt(json.expiresAt);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/password/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update password");
      }

      setSuccess(json.message);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const userName = user.firstName || user.lastName 
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : user.email;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Update User Password</h2>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="user-info">
            <div className="info-label">User:</div>
            <div className="info-value">
              <strong>{userName}</strong>
              <span className="email-text">{user.email}</span>
            </div>
          </div>

          {step === "request" && (
            <div className="step-content">
              <div className="security-notice">
                <div className="notice-icon">🔒</div>
                <div>
                  <h3>Two-Step Verification Required</h3>
                  <p>
                    For security purposes, an OTP will be sent to the user's email
                    address. You will need to enter this OTP to complete the password
                    update.
                  </p>
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRequestOTP}
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <form onSubmit={handleUpdatePassword} className="step-content">
              <div className="success-notice">
                <div className="notice-icon">✉️</div>
                <div>
                  <h3>OTP Sent Successfully</h3>
                  <p>
                    A 6-digit verification code has been sent to <strong>{user.email}</strong>.
                    Please enter the code below to proceed.
                  </p>
                  {expiresAt && (
                    <p className="expiry-text">
                      Code expires in 10 minutes
                    </p>
                  )}
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="form-group">
                <label htmlFor="otp">Verification Code (OTP)</label>
                <input
                  id="otp"
                  type="text"
                  className="form-input otp-input"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  className="form-input"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>

              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep("request")}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }
          .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
          }
          .modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: #111827;
          }
          .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            color: #9ca3af;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
          }
          .close-btn:hover {
            background: #f3f4f6;
            color: #374151;
          }
          .modal-body {
            padding: 24px;
          }
          .user-info {
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 12px;
          }
          .info-label {
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
          }
          .info-value {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .info-value strong {
            font-size: 14px;
            color: #111827;
          }
          .email-text {
            font-size: 13px;
            color: #6b7280;
          }
          .step-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .security-notice,
          .success-notice {
            display: flex;
            gap: 12px;
            padding: 16px;
            border-radius: 8px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
          }
          .success-notice {
            background: #f0fdf4;
            border-color: #bbf7d0;
          }
          .notice-icon {
            font-size: 24px;
            flex-shrink: 0;
          }
          .security-notice h3,
          .success-notice h3 {
            font-size: 14px;
            font-weight: 600;
            margin: 0 0 6px 0;
            color: #1e40af;
          }
          .success-notice h3 {
            color: #166534;
          }
          .security-notice p,
          .success-notice p {
            font-size: 13px;
            margin: 0;
            color: #1e40af;
            line-height: 1.5;
          }
          .success-notice p {
            color: #166534;
          }
          .expiry-text {
            margin-top: 8px !important;
            font-size: 12px !important;
            color: #dc2626 !important;
            font-weight: 500;
          }
          .alert {
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
          }
          .alert-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
          }
          .alert-success {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-group label {
            font-size: 13px;
            font-weight: 500;
            color: #374151;
          }
          .form-input {
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s;
          }
          .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .form-input:disabled {
            background: #f3f4f6;
            cursor: not-allowed;
          }
          .otp-input {
            font-size: 20px;
            letter-spacing: 8px;
            text-align: center;
            font-family: 'Courier New', monospace;
            font-weight: 600;
          }
          .button-group {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 8px;
          }
          .btn {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
          }
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .btn-primary {
            background: #3b82f6;
            color: white;
          }
          .btn-primary:hover:not(:disabled) {
            background: #2563eb;
          }
          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
          }
          .btn-secondary:hover:not(:disabled) {
            background: #e5e7eb;
          }
        `}</style>
      </div>
    </div>
  );
}

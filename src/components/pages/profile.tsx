"use client";
import CommonFooter from "@/core/common/footer/commonFooter";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { useSession } from "next-auth/react";


export default function ProfileComponent () {
  const { update } = useSession();
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStep, setPasswordStep] = useState<"request" | "verify">(
    "request",
  );
  const [otp, setOtp] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [initialProfile, setInitialProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    role: string;
    avatar: string | null;
  } | null>(null);

  const togglePasswordVisibility = () => {
    setPasswordVisible((prevState) => !prevState);
  };

  const handleAvatarUploadComplete = (res: Array<{ url: string }>) => {
    const file = res?.[0];
    if (!file?.url) {
      return;
    }
    setAvatar(file.url);
    setAvatarDirty(true);
    setError(null);
    setSuccess(null);
  };

  const handleAvatarClear = () => {
    setAvatar(null);
    setAvatarDirty(true);
  };

  const handleRequestPasswordOTP = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    try {
      setPasswordSaving(true);

      const res = await fetch("/api/profile/password/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to request OTP");
      }

      setPasswordSuccess(data?.message || "OTP sent to your email.");
      setPasswordStep("verify");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to request OTP",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleVerifyPasswordOTP = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!otp || otp.length !== 6) {
      setPasswordError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      setPasswordSaving(true);

      const res = await fetch("/api/profile/password/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp, newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setPasswordStep("request");
      setPasswordSuccess("Password updated successfully.");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/profile");

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to load profile");
        }

        const data = await res.json();

        if (!isMounted) {
          return;
        }

        const profileData = {
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
          username: data.username || "",
          role: data.role || "",
          avatar: data.avatar || null,
        };

        setFirstName(profileData.firstName);
        setLastName(profileData.lastName);
        setEmail(profileData.email);
        setPhone(profileData.phone);
        setUsername(profileData.username);
        setRole(profileData.role);
        setAvatar(profileData.avatar);
        setAvatarDirty(false);
        setInitialProfile(profileData);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load profile",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = () => {
    if (!initialProfile) {
      return;
    }

    setFirstName(initialProfile.firstName);
    setLastName(initialProfile.lastName);
    setEmail(initialProfile.email);
    setPhone(initialProfile.phone);
    setUsername(initialProfile.username);
    setRole(initialProfile.role);
    setAvatar(initialProfile.avatar);
    setAvatarDirty(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          avatar: avatarDirty ? avatar : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update profile");
      }

      const data = await res.json();

      const updated = {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phone: data.phone || "",
        username: data.username || "",
        role: data.role || "",
        avatar: data.avatar || null,
      };

      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setEmail(updated.email);
      setPhone(updated.phone);
      setUsername(updated.username);
      setRole(updated.role);
      setAvatar(updated.avatar);
      setInitialProfile(updated);
      setSuccess("Profile updated successfully.");

      // Refresh NextAuth session so header avatar & user info update immediately
      try {
        await update();
      } catch {
        // Ignore session update errors; UI will still work with updated profile data
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Profile</h4>
            <h6>User Profile</h6>
          </div>
        </div>
        {/* /product list */}
        <div className="card">
          <div className="card-header">
            <h4>Profile</h4>
          </div>
          <div className="card-body profile-body">
            {error && <p className="text-danger mb-2">{error}</p>}
            {success && <p className="text-success mb-2">{success}</p>}
            <h5 className="mb-2">
              <i className="ti ti-user text-primary me-1" />
              Basic Information
            </h5>
            <div className="profile-pic-upload image-field">
              <div className="profile-pic p-2">
                <img
                  src={avatar || "assets/img/profiles/avator1.jpg"}
                  className="object-fit-cover h-100 rounded-1"
                  alt="user"
                />
                <button
                  type="button"
                  className="close rounded-1"
                  onClick={handleAvatarClear}
                  disabled={loading || saving}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div className="mb-3">
                <div className="image-upload mb-0 d-inline-flex">
                  <UploadButton<OurFileRouter, "profileAvatar">
                    endpoint="profileAvatar"
                    onUploadBegin={() => {
                      setError(null);
                      setSuccess(null);
                    }}
                    onClientUploadComplete={handleAvatarUploadComplete}
                    onUploadError={(error) => {
                      setError(error?.message || "Failed to upload image");
                    }}
                  />
                </div>
                <p className="mt-2">
                  Upload an image below 2 MB. Accepted file formats: JPG, PNG.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <label className="form-label">
                    First Name<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <label className="form-label">
                    Last Name<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <label>
                    Email<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    disabled
                  />
                </div>
              </div>
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <label className="form-label">
                    Phone Number<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-control"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <label className="form-label">
                    User Name<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    disabled
                  />
                </div>
              </div>
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <input
                    type="text"
                    className="form-control"
                    value={role}
                    disabled
                  />
                </div>
              </div>
              <div className="col-lg-6 col-sm-12">
                <div className="mb-3">
                  <h5 className="mb-2 mt-2">
                    <i className="ti ti-lock text-primary me-1" />
                    Change Password
                  </h5>
                  {passwordError && (
                    <p className="text-danger mb-2">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-success mb-2">{passwordSuccess}</p>
                  )}
                </div>
              </div>
              <div className="col-lg-4 col-sm-12">
                <div className="mb-3">
                  <label className="form-label">
                    Current Password<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={passwordSaving || passwordStep === "verify"}
                  />
                </div>
              </div>
              {passwordStep === "verify" && (
                <>
                  <div className="col-lg-4 col-sm-12">
                    <div className="mb-3">
                      <label className="form-label">
                        OTP Code<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        maxLength={6}
                        disabled={passwordSaving}
                      />
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-12">
                    <div className="mb-3">
                      <label className="form-label">
                        New Password<span className="text-danger ms-1">*</span>
                      </label>
                      <div className="pass-group">
                        <input
                          type={isPasswordVisible ? "text" : "password"}
                          className="form-control"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={passwordSaving}
                        />
                        <span
                          className={`ti toggle-password ${
                            isPasswordVisible ? "ti-eye" : "ti-eye-off"
                          }`}
                          onClick={togglePasswordVisibility}
                        ></span>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Confirm New Password
                        <span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type={isPasswordVisible ? "text" : "password"}
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={passwordSaving}
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="col-12 d-flex justify-content-end mb-3">
                {passwordStep === "request" ? (
                  <button
                    type="button"
                    className="btn btn-primary shadow-none"
                    onClick={handleRequestPasswordOTP}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Sending OTP..." : "Send OTP"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary shadow-none"
                    onClick={handleVerifyPasswordOTP}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Updating Password..." : "Update Password"}
                  </button>
                )}
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary me-2 shadow-none"
                  onClick={handleCancel}
                  disabled={loading || saving || !initialProfile}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary shadow-none"
                  onClick={handleSave}
                  disabled={loading || saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* /product list */}
      </div>
      <CommonFooter />
    </div>

  );
};


/**
 * User Management Types
 */

export interface UserWithRole {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  isActive: boolean;
  role: string;
  roleId?: string | null;
  invitedAt?: Date | null;
  joinedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customRole?: {
    id: string;
    name: string;
    displayName: string;
    isSystemRole: boolean;
  } | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roleId: string;
  createdAt: Date;
  expiresAt: Date;
  role: {
    id: string;
    name: string;
    displayName: string;
  };
  invitedBy: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
}

export interface InviteUserFormData {
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
}

export interface AcceptInvitationFormData {
  token: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

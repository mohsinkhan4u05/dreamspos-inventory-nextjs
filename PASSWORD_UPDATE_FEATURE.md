# Super Admin Password Update Feature

## Overview
This feature allows Super Admin users to update any user's password through the UI with mandatory two-step OTP verification via email.

## Features
- ✅ **Super Admin Only**: Only users with SUPER_ADMIN role can access this feature
- ✅ **Two-Step Verification**: OTP sent to user's email before password update
- ✅ **Secure OTP**: 6-digit OTP with SHA-256 hashing and 10-minute expiration
- ✅ **Email Notifications**: Professional email template with security warnings
- ✅ **Audit Logging**: All password updates are logged for security tracking
- ✅ **Self-Protection**: Super Admins cannot change their own password through this method

## Setup Instructions

### 1. Run Database Migration

The feature requires a new database table `password_update_otps`. Run the Prisma migration:

```bash
npx prisma migrate dev --name add_password_update_otp
```

This will create the `PasswordUpdateOTP` model in your database.

### 2. Environment Variables

Ensure the following environment variables are set in your production environment:

```env
# Application URL (Required for email links)
APP_URL=https://your-production-domain.com

# Organization Name (Optional, defaults to "DreamsPOS")
ORGANIZATION_NAME=YourCompanyName

# Email Service Configuration
# (Configure based on your email provider)
```

### 3. Regenerate Prisma Client

After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

## How It Works

### User Flow

1. **Super Admin initiates password update**
   - Navigates to Users page
   - Clicks "🔑 Password" button next to any user
   
2. **Request OTP**
   - Modal opens with security notice
   - Super Admin clicks "Send OTP"
   - System sends 6-digit OTP to user's email
   
3. **Verify OTP and Update Password**
   - Super Admin enters OTP received by user
   - Enters new password (minimum 8 characters)
   - Confirms password
   - System verifies OTP and updates password

### Security Features

- **OTP Hashing**: OTPs are hashed using SHA-256 before storage
- **Time-Limited**: OTPs expire after 10 minutes
- **Single Use**: OTPs are marked as verified after use
- **Email Verification**: User receives email with OTP and security warning
- **Audit Trail**: All password updates are logged with admin and user details

## API Endpoints

### Request OTP
```
POST /api/users/[id]/password/request-otp
```
- Requires: SUPER_ADMIN role
- Sends OTP to user's email
- Returns: Success message and expiry time

### Update Password
```
POST /api/users/[id]/password/update
```
- Requires: SUPER_ADMIN role + valid OTP
- Body: `{ otp: string, newPassword: string }`
- Returns: Success message

## Files Created/Modified

### New Files
- `src/lib/otp.ts` - OTP generation and validation utilities
- `src/lib/email/otp-template.ts` - Email template for OTP
- `src/app/api/users/[id]/password/request-otp/route.ts` - API to request OTP
- `src/app/api/users/[id]/password/update/route.ts` - API to update password
- `src/components/user-management/UpdatePasswordModal.tsx` - UI component
- `prisma/schema.prisma` - Added PasswordUpdateOTP model

### Modified Files
- `src/app/(features)/(settings)/users/page.tsx` - Added password update button and modal
- `.env.example` - Added APP_URL documentation

## Database Schema

```prisma
model PasswordUpdateOTP {
  id        String   @id @default(cuid())
  userId    String
  adminId   String
  otpHash   String
  expiresAt DateTime
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, verified])
  @@index([expiresAt])
  @@map("password_update_otps")
}
```

## Testing

### Test Scenarios

1. **Happy Path**
   - Super Admin requests OTP
   - User receives email with OTP
   - Super Admin enters correct OTP and new password
   - Password is updated successfully

2. **OTP Expiry**
   - Request OTP
   - Wait 10+ minutes
   - Try to use expired OTP
   - Should receive error message

3. **Invalid OTP**
   - Request OTP
   - Enter incorrect OTP
   - Should receive error message

4. **Permission Check**
   - Non-Super Admin user tries to access feature
   - Should not see password update button
   - API should return 403 Forbidden

5. **Self-Update Prevention**
   - Super Admin tries to update their own password
   - Should receive error message

## Security Considerations

- OTPs are never stored in plain text
- OTPs expire after 10 minutes
- Email contains security warning for users
- All actions are logged in audit trail
- Super Admins cannot update their own password through this method
- Password must be minimum 8 characters

## Support

For issues or questions, contact the development team.

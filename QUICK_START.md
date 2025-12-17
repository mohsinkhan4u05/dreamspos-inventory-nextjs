# User Management Module - Quick Start Guide

## 🚀 Quick Setup (5 Steps)

### Step 1: Run Database Migration
```bash
cd nextjs
npx prisma migrate dev --name add_user_invitations
npx prisma generate
```

### Step 2: Seed User Permissions
```bash
npx ts-node scripts/seed-user-permissions.ts
```

### Step 3: Configure Environment Variables
Add to your `.env` file:
```env
# Organization
ORGANIZATION_NAME="DreamsPOS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (Development - logs to console)
EMAIL_FROM="noreply@dreamspos.com"
```

### Step 4: Restart Development Server
```bash
npm run dev
```

### Step 5: Test the Feature
1. Login as SUPER_ADMIN
2. Navigate to `/settings/users` (you'll need to add this route)
3. Click "Invite User"
4. Fill in the form and send invitation
5. Check console for invitation email (in development mode)
6. Copy the invitation URL and test acceptance flow

## 📋 What Was Implemented

### ✅ Database
- Extended User model with invitation tracking
- Created UserInvitation table
- Added UserStatus and InvitationStatus enums

### ✅ Backend (API)
- `POST /api/users/invite` - Send invitation
- `POST /api/users/invite/accept` - Accept invitation
- `POST /api/users/invite/reject` - Reject invitation
- `POST /api/users/invite/resend` - Resend invitation
- `GET /api/users` - List users + pending invitations
- `PATCH /api/users/[id]/status` - Activate/deactivate user
- `DELETE /api/users/[id]` - Soft delete user

### ✅ Security
- Cryptographically secure tokens (64 chars)
- 25-day expiration
- Single-use tokens
- RBAC protection on all endpoints
- Soft delete (no permanent deletion)

### ✅ Email
- Zoho-style HTML email template
- Plain text fallback
- Configurable organization name
- Expiry notice

### ✅ UI Components
- InviteUserModal component
- TypeScript types for user management

## 🔧 Remaining UI Work

You need to create these pages:

### 1. Users List Page
**Path:** `src/app/(features)/(settings)/users/page.tsx`

**Features:**
- Display all users in a table
- Show pending invitations
- Activate/Deactivate users
- Resend invitations
- Delete users
- Invite new users (modal)

**See:** `IMPLEMENTATION_GUIDE.md` for complete code

### 2. Invitation Acceptance Page
**Path:** `src/app/invite/accept/page.tsx`

**Features:**
- Validate invitation token
- Show invitation details
- Accept form (password, name)
- Reject button

**See:** `IMPLEMENTATION_GUIDE.md` for complete code

### 3. Add Navigation Link
Add to your settings menu:
```tsx
<Link href="/settings/users">
  <Can resource="users" action="read">
    User Management
  </Can>
</Link>
```

## 🎯 RBAC Permissions

### SUPER_ADMIN
- ✅ Invite users
- ✅ View users
- ✅ Activate/deactivate users
- ✅ Delete users
- ✅ Resend invitations

### ADMIN
- ✅ View users only
- ❌ Cannot invite or modify

### Other Roles
- ❌ No access to user management

## 📧 Email Configuration (Production)

### Option 1: Nodemailer (SMTP)
```typescript
// In src/lib/email/send-email.ts
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: options.from || process.env.EMAIL_FROM,
  to: options.to,
  subject: options.subject,
  html: options.html,
  text: options.text,
});
```

### Option 2: SendGrid
```typescript
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: options.to,
  from: options.from || process.env.EMAIL_FROM,
  subject: options.subject,
  html: options.html,
  text: options.text,
});
```

## 🧪 Testing Flow

### 1. Invite a User
```bash
curl -X POST http://localhost:3000/api/users/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roleId": "role-id-here"
  }'
```

### 2. Check Console for Email
Look for the invitation URL in your console logs.

### 3. Accept Invitation
Visit the URL from the email and fill in the form.

### 4. Verify User Created
Check the users list or database.

## 🐛 Troubleshooting

### TypeScript Errors
**Issue:** `Property 'userInvitation' does not exist`
**Solution:** Run `npx prisma generate` after migration

### Email Not Sending
**Issue:** Emails not being sent
**Solution:** 
- Development: Check console logs
- Production: Verify email service credentials

### 404 on `/settings/users`
**Issue:** Route not found
**Solution:** Create the page at `src/app/(features)/(settings)/users/page.tsx`

### Permission Denied
**Issue:** Cannot access user management
**Solution:** 
- Ensure you're logged in as SUPER_ADMIN
- Run the permissions seed script
- Check RBAC middleware is working

## 📚 Next Steps

1. ✅ Run migration and seed
2. ⬜ Create users list page
3. ⬜ Create invitation acceptance page
4. ⬜ Add navigation link
5. ⬜ Configure production email service
6. ⬜ Test complete flow
7. ⬜ Deploy to production

## 💡 Tips

- **Development:** Emails log to console - check terminal
- **Testing:** Use a test email service like Mailtrap
- **Security:** Never commit email credentials to git
- **UX:** Add loading states and error handling
- **Audit:** All actions are logged in AuditLog table

## 🎨 Customization

### Change Invitation Expiry
Edit `src/lib/invitation-token.ts`:
```typescript
export function calculateExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // Change to 30 days
  return expiryDate;
}
```

### Customize Email Template
Edit `src/lib/email/invitation-template.ts` to match your branding.

### Add More User Fields
Extend the User model in `prisma/schema.prisma` and update forms accordingly.

---

**Need Help?** Check `IMPLEMENTATION_GUIDE.md` for detailed code examples and architecture details.

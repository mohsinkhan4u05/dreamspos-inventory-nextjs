# RBAC Implementation Guide

## Overview

This guide explains how to implement and use the Role-Based Access Control (RBAC) system in your DreamsPOS inventory management application.

## Architecture

### Permission Resolution Strategy

The system uses a **backward-compatible** permission resolution order:

1. **SUPER_ADMIN** → Always has all permissions
2. **Custom Role** (if `user.roleId` exists) → Check granular permissions via `Role → RolePermission → Permission`
3. **Enum Role** (fallback) → Use legacy enum-based permissions for backward compatibility

This ensures existing users continue to work without any changes.

---

## Database Schema

### New Tables

1. **Role** - Custom and system roles
2. **Permission** - Granular permissions (resource + action)
3. **RolePermission** - Many-to-many join table
4. **AuditLog** - Track critical actions

### User Model Changes

```prisma
model User {
  role      UserRole @default(STAFF)  // Legacy enum (kept)
  roleId    String?                    // New: Link to custom role
  customRole Role?   @relation(...)    // Relation to Role table
}
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Generate Prisma client with new schema
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_rbac_system

# Seed permissions and system roles
npx ts-node prisma/seeds/rbac-seed.ts
```

### 2. Update NextAuth Configuration

Add `roleId` to the JWT token:

```ts
// src/app/api/auth/[...nextauth]/route.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role;
      token.roleId = user.roleId; // Add this
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.role = token.role;
      session.user.roleId = token.roleId; // Add this
    }
    return session;
  },
}
```

---

## Backend Usage

### Protect API Routes

#### Option 1: Using `withPermission` HOF

```ts
import { withPermission } from "@/lib/rbac/middleware";

export const POST = withPermission("sales", "create", async (request, user) => {
  // user is authenticated and has sales.create permission
  // Your logic here
  return NextResponse.json({ success: true });
});
```

#### Option 2: Manual Permission Check

```ts
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
  const { authorized, user, error } = await requirePermission(
    request,
    "inventory",
    "adjust"
  );

  if (!authorized) {
    return NextResponse.json({ error }, { status: 403 });
  }

  // Your logic here
}
```

#### Option 3: Check Multiple Permissions

```ts
import { requireAllPermissions } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
  const { authorized, user } = await requireAllPermissions(request, [
    { resource: "sales", action: "create" },
    { resource: "inventory", action: "update" },
  ]);

  if (!authorized) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Your logic here
}
```

### Audit Logging

```ts
import { auditLog } from "@/lib/rbac/audit";

// Log role creation
await auditLog.roleCreated(userId, roleId, roleName, request);

// Log inventory adjustment
await auditLog.inventoryAdjusted(userId, productId, adjustmentData, request);

// Custom audit log
await auditLog.custom({
  userId,
  action: "custom.action",
  resource: "resource_type",
  resourceId: "resource_id",
  description: "Description of action",
  metadata: { key: "value" },
});
```

---

## Frontend Usage

### 1. Permission-Based Rendering

#### Using `<Can />` Component

```tsx
import { Can } from "@/components/rbac/Can";

function SalesOrderPage() {
  return (
    <div>
      <h1>Sales Orders</h1>
      
      <Can resource="sales" action="create">
        <Button onClick={createOrder}>Create New Order</Button>
      </Can>

      <Can 
        resource="sales" 
        action="delete"
        fallback={<p>You cannot delete orders</p>}
      >
        <Button variant="danger">Delete Order</Button>
      </Can>
    </div>
  );
}
```

#### Using `<Cannot />` Component (Inverse)

```tsx
import { Cannot } from "@/components/rbac/Can";

<Cannot resource="sales" action="approve">
  <Alert>You need approval permission to proceed</Alert>
</Cannot>
```

### 2. Permission Hooks

#### Check Single Permission

```tsx
import { usePermission } from "@/hooks/usePermission";

function EditButton() {
  const { hasPermission, loading } = usePermission("sales", "update");

  if (loading) return <Spinner />;
  if (!hasPermission) return null;

  return <Button>Edit</Button>;
}
```

#### Get All User Permissions

```tsx
import { useUserPermissions } from "@/hooks/usePermission";

function PermissionsList() {
  const { permissions, loading, hasPermission } = useUserPermissions();

  if (loading) return <Spinner />;

  return (
    <div>
      <h3>Your Permissions:</h3>
      <ul>
        {permissions.map((p) => (
          <li key={`${p.resource}.${p.action}`}>
            {p.resource}.{p.action}
          </li>
        ))}
      </ul>

      {hasPermission("sales", "create") && (
        <Button>Create Sales Order</Button>
      )}
    </div>
  );
}
```

#### Check User Role

```tsx
import { useRole } from "@/hooks/usePermission";

function AdminPanel() {
  const { role, isSuperAdmin, isAdmin, loading } = useRole();

  if (loading) return <Spinner />;
  if (!isAdmin) return <AccessDenied />;

  return <AdminDashboard />;
}
```

### 3. Conditional Menu Items

```tsx
import { Can } from "@/components/rbac/Can";

function Sidebar() {
  return (
    <nav>
      <Can resource="sales" action="read">
        <MenuItem href="/sales">Sales</MenuItem>
      </Can>

      <Can resource="purchase" action="read">
        <MenuItem href="/purchase">Purchase</MenuItem>
      </Can>

      <Can resource="inventory" action="read">
        <MenuItem href="/inventory">Inventory</MenuItem>
      </Can>

      <Can resource="roles" action="manage">
        <MenuItem href="/settings/roles">Role Management</MenuItem>
      </Can>
    </nav>
  );
}
```

---

## Admin UI - Role Management

### API Endpoints

| Method | Endpoint | Permission Required | Description |
|--------|----------|---------------------|-------------|
| GET | `/api/rbac/roles` | `roles.read` | List all roles |
| POST | `/api/rbac/roles` | `roles.create` | Create new role |
| GET | `/api/rbac/roles/[id]` | `roles.read` | Get role details |
| PUT | `/api/rbac/roles/[id]` | `roles.update` | Update role |
| DELETE | `/api/rbac/roles/[id]` | `roles.delete` | Delete role |
| GET | `/api/rbac/permissions` | `roles.read` | List all permissions |

### Example: Fetch Roles

```tsx
const response = await fetch("/api/rbac/roles");
const { roles } = await response.json();
```

### Example: Create Role

```tsx
const response = await fetch("/api/rbac/roles", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "WAREHOUSE_MANAGER",
    displayName: "Warehouse Manager",
    description: "Manages warehouse operations",
    permissionIds: ["perm_id_1", "perm_id_2"],
  }),
});
```

### Example: Update Role Permissions

```tsx
const response = await fetch(`/api/rbac/roles/${roleId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    displayName: "Updated Name",
    permissionIds: ["new_perm_1", "new_perm_2"],
  }),
});
```

---

## Permission Matrix

### Available Resources

- `sales` - Sales orders and invoices
- `purchase` - Purchase orders
- `inventory` - Stock management
- `customers` - Customer management
- `vendors` - Vendor/supplier management
- `packages` - Package management
- `shipments` - Shipment tracking
- `payments` - Payment processing
- `reports` - Reports and analytics
- `users` - User management
- `roles` - Role management
- `settings` - System settings
- `products` - Product catalog
- `stores` - Store management

### Available Actions

- `read` - View/list resources
- `create` - Create new resources
- `update` - Edit existing resources
- `delete` - Delete resources
- `approve` - Approve transactions
- `email` - Send emails
- `export` - Export data
- `manage` - Full management access
- `adjust` - Adjust inventory levels

---

## System Roles

### SUPER_ADMIN
- **All permissions** - Complete system access
- Cannot be edited or deleted
- Bypasses all permission checks

### ADMIN
- Almost all permissions except system configuration
- Can manage users and roles
- Full operational access

### MANAGER
- Operational management access
- Can create and update most resources
- Cannot delete critical data or manage users

### STAFF
- Limited operational access
- Can create and update basic resources
- Read-only for sensitive data

### CASHIER
- POS and payment access only
- Can create sales and record payments
- Read-only for products and inventory

---

## Migration Path for Existing Users

### Automatic Backward Compatibility

Existing users will continue to work with their enum-based roles:

1. User has `role = ADMIN` and `roleId = null`
2. System checks enum-based permissions (fallback)
3. User gets ADMIN permissions as before

### Migrating to Custom Roles

To migrate a user to the new system:

```ts
// 1. Create or find custom role
const role = await prisma.role.findUnique({
  where: { name: "ADMIN" }
});

// 2. Assign role to user
await prisma.user.update({
  where: { id: userId },
  data: { roleId: role.id }
});

// 3. User now uses granular permissions
```

---

## Testing Checklist

- [ ] Existing users still work without `roleId`
- [ ] SUPER_ADMIN has all permissions
- [ ] Custom roles work correctly
- [ ] Unauthorized API access returns 403
- [ ] UI hides unauthorized actions
- [ ] Audit logs are created
- [ ] System roles cannot be edited/deleted
- [ ] Roles with assigned users cannot be deleted

---

## Security Best Practices

1. **Always check permissions on the backend** - Frontend checks are for UX only
2. **Use audit logging** for sensitive operations
3. **Never expose permission logic** in client-side code
4. **Validate permission IDs** when creating/updating roles
5. **Protect role management** endpoints with `roles.manage` permission
6. **Rate limit** permission check endpoints
7. **Log failed permission** checks for security monitoring

---

## Troubleshooting

### Permission not working

1. Check if user has `roleId` set
2. Verify role has the required permission
3. Check if role is active (`isActive = true`)
4. Ensure permission exists in database
5. Clear session and re-login

### Audit log not created

- Check database connection
- Verify `AuditLog` model in Prisma schema
- Run `npx prisma generate`

### Frontend permission check failing

- Verify `/api/rbac/check-permission` endpoint works
- Check browser console for errors
- Ensure user is authenticated

---

## Next Steps

1. Run database migration
2. Seed permissions and roles
3. Update NextAuth configuration
4. Build admin UI for role management
5. Protect existing API routes
6. Add permission checks to frontend
7. Test thoroughly
8. Deploy to production

---

## Support

For issues or questions, refer to:
- Prisma documentation: https://www.prisma.io/docs
- NextAuth documentation: https://next-auth.js.org
- Project repository issues

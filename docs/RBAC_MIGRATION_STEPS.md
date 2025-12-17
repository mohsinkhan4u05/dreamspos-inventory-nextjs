# RBAC Migration Steps - Quick Start Guide

## ✅ Pre-Migration Checklist

- [ ] Backup your database
- [ ] Review current user roles in production
- [ ] Test in development environment first
- [ ] Notify users of upcoming changes (if any)

---

## Step 1: Database Migration (5 minutes)

### 1.1 Generate Prisma Client

```bash
npx prisma generate
```

### 1.2 Create Migration

```bash
npx prisma migrate dev --name add_rbac_system
```

This will:
- Add `roleId` column to `users` table (nullable)
- Create `roles`, `permissions`, `role_permissions`, `audit_logs` tables
- Existing users remain unchanged (backward compatible)

### 1.3 Seed Permissions and Roles

```bash
npx ts-node prisma/seeds/rbac-seed.ts
```

This creates:
- 90+ granular permissions
- 5 system roles (SUPER_ADMIN, ADMIN, MANAGER, STAFF, CASHIER)
- Permission assignments for each role

---

## Step 2: Update NextAuth Configuration (2 minutes)

Edit `src/app/api/auth/[...nextauth]/route.ts`:

```ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = user.role;
      token.roleId = user.roleId; // ← ADD THIS LINE
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.roleId = token.roleId; // ← ADD THIS LINE
    }
    return session;
  },
}
```

---

## Step 3: Test Permission System (5 minutes)

### 3.1 Test API Permission Check

```bash
# Start your dev server
npm run dev

# Test permission check endpoint
curl -X POST http://localhost:3000/api/rbac/check-permission \
  -H "Content-Type: application/json" \
  -d '{"resource":"sales","action":"create"}'
```

### 3.2 Verify Existing Users Still Work

1. Login with existing user
2. Verify they can access their normal features
3. Check that enum-based permissions work

---

## Step 4: Protect Your First API Route (10 minutes)

### Example: Protect Sales Order Creation

**Before:**
```ts
// src/app/api/sales-orders/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const order = await prisma.salesOrder.create({ data: body });
  return NextResponse.json({ order });
}
```

**After:**
```ts
import { withPermission } from "@/lib/rbac/middleware";

export const POST = withPermission("sales", "create", async (request, user) => {
  const body = await request.json();
  const order = await prisma.salesOrder.create({
    data: { ...body, createdBy: user.id },
  });
  return NextResponse.json({ order });
});
```

Test:
- Login as CASHIER → should have access
- Login as user without sales.create → should get 403

---

## Step 5: Add Permission Checks to Frontend (15 minutes)

### 5.1 Hide Create Button Based on Permission

```tsx
import { Can } from "@/components/rbac/Can";

<Can resource="sales" action="create">
  <Button onClick={handleCreate}>Create Sales Order</Button>
</Can>
```

### 5.2 Update Sidebar Menu

```tsx
import { Can } from "@/components/rbac/Can";

<Can resource="sales" action="read">
  <MenuItem href="/sales">Sales</MenuItem>
</Can>

<Can resource="roles" action="manage">
  <MenuItem href="/settings/roles">Role Management</MenuItem>
</Can>
```

---

## Step 6: Create Admin UI for Roles (Optional - 30 minutes)

Create these pages:

1. **Role List** - `/settings/roles`
   - Display all roles
   - Create new role button
   - Edit/Delete actions

2. **Create Role** - `/settings/roles/create`
   - Role name and description
   - Permission matrix (checkboxes)

3. **Edit Role** - `/settings/roles/[id]/edit`
   - Update role details
   - Modify permissions

4. **User Management** - `/settings/users/[id]/edit`
   - Assign custom role to user

See `docs/RBAC_EXAMPLES.md` for complete code examples.

---

## Step 7: Gradual Rollout Strategy

### Phase 1: Monitoring (Week 1)
- Deploy with RBAC system enabled
- All existing users continue with enum roles
- Monitor audit logs
- No user disruption

### Phase 2: Admin Testing (Week 2)
- Create custom roles for testing
- Assign test users to custom roles
- Verify permissions work correctly
- Gather feedback

### Phase 3: Gradual Migration (Week 3-4)
- Migrate power users to custom roles
- Create department-specific roles
- Assign users based on actual needs

### Phase 4: Full Adoption (Month 2)
- All users on custom roles
- Deprecate enum-based fallback (optional)
- Full granular permission control

---

## Step 8: Verification Checklist

After deployment, verify:

- [ ] Existing users can still login
- [ ] Enum-based permissions work (backward compatibility)
- [ ] New permission check API works
- [ ] Protected API routes return 403 for unauthorized users
- [ ] Frontend permission checks hide unauthorized actions
- [ ] Audit logs are being created
- [ ] System roles cannot be edited/deleted
- [ ] Custom roles can be created/edited
- [ ] Users can be assigned to custom roles

---

## Rollback Plan

If issues occur:

### Option 1: Quick Rollback (No Data Loss)

```bash
# Revert migration
npx prisma migrate resolve --rolled-back add_rbac_system

# Previous code still works (roleId is nullable)
```

### Option 2: Keep Schema, Disable Features

- Comment out permission checks in API routes
- Hide role management UI
- System continues with enum-based roles

---

## Common Issues & Solutions

### Issue: Permission check returns false for existing users

**Solution:** User doesn't have `roleId` set, so they're using enum-based permissions. Verify the enum permission mapping in `src/lib/rbac/permissions.ts`.

### Issue: API route returns 401 instead of 403

**Solution:** User is not authenticated. Check NextAuth session and JWT token.

### Issue: Audit logs not created

**Solution:** Run `npx prisma generate` to update Prisma client with new models.

### Issue: Cannot delete role with assigned users

**Solution:** This is by design. Reassign users to different role first, then delete.

---

## Performance Considerations

### Database Indexes

The schema includes indexes on:
- `role_permissions(roleId, permissionId)`
- `permissions(resource, action)`
- `audit_logs(userId, action, resource)`

### Caching Strategy (Optional)

For high-traffic applications, consider caching:

```ts
// Cache user permissions for 5 minutes
const cacheKey = `user:${userId}:permissions`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const permissions = await getUserPermissions(userId);
await redis.setex(cacheKey, 300, JSON.stringify(permissions));
return permissions;
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Failed Permission Checks**
   - High rate might indicate misconfigured roles

2. **Audit Log Volume**
   - Track sensitive operations

3. **Role Assignment Changes**
   - Alert on unexpected role changes

4. **API 403 Errors**
   - Monitor for authorization issues

### Example Monitoring Query

```sql
-- Failed permission checks in last hour
SELECT 
  action,
  COUNT(*) as count
FROM audit_logs
WHERE 
  action LIKE '%failed%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY action
ORDER BY count DESC;
```

---

## Next Steps

1. ✅ Complete Steps 1-3 (Database & Auth)
2. ✅ Protect 1-2 critical API routes
3. ✅ Add frontend permission checks
4. ✅ Test thoroughly in development
5. ✅ Deploy to staging
6. ✅ Create custom roles for your team
7. ✅ Migrate users gradually
8. ✅ Monitor and iterate

---

## Support & Documentation

- **Implementation Guide:** `docs/RBAC_IMPLEMENTATION_GUIDE.md`
- **Code Examples:** `docs/RBAC_EXAMPLES.md`
- **Prisma Schema:** `prisma/schema.prisma`
- **Seed Script:** `prisma/seeds/rbac-seed.ts`

For questions or issues, refer to the documentation or create an issue in the project repository.

---

## Estimated Timeline

| Task | Time | Complexity |
|------|------|------------|
| Database Migration | 5 min | Low |
| NextAuth Update | 2 min | Low |
| Protect API Routes | 10 min each | Medium |
| Frontend Checks | 15 min | Low |
| Admin UI | 2-4 hours | Medium |
| Testing | 1-2 hours | Medium |
| **Total** | **4-6 hours** | **Medium** |

Good luck with your RBAC implementation! 🚀

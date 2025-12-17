# RBAC Implementation Examples

## Example 1: Protect Sales Order API

### Before (No Permission Check)

```ts
// src/app/api/sales-orders/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const order = await prisma.salesOrder.create({
    data: body,
  });
  
  return NextResponse.json({ order });
}
```

### After (With Permission Check)

```ts
// src/app/api/sales-orders/route.ts
import { withPermission } from "@/lib/rbac/middleware";

export const POST = withPermission("sales", "create", async (request, user) => {
  const body = await request.json();
  
  const order = await prisma.salesOrder.create({
    data: {
      ...body,
      createdBy: user.id, // Track who created it
    },
  });
  
  return NextResponse.json({ order });
});
```

---

## Example 2: Inventory Adjustment with Audit Log

```ts
// src/app/api/inventory/adjust/route.ts
import { withPermission } from "@/lib/rbac/middleware";
import { auditLog } from "@/lib/rbac/audit";

export const POST = withPermission("inventory", "adjust", async (request, user) => {
  const { productId, quantity, reason } = await request.json();
  
  // Perform adjustment
  const adjustment = await prisma.stockAdjustment.create({
    data: {
      productId,
      quantityAdjusted: quantity,
      reason,
      createdBy: user.id,
    },
  });
  
  // Log the action
  await auditLog.inventoryAdjusted(
    user.id,
    productId,
    { quantity, reason },
    request
  );
  
  return NextResponse.json({ adjustment });
});
```

---

## Example 3: Sales Order Page with Permission Checks

```tsx
// src/app/(features)/(sales)/sales-orders/page.tsx
"use client";

import { Can } from "@/components/rbac/Can";
import { usePermission } from "@/hooks/usePermission";

export default function SalesOrdersPage() {
  const { hasPermission: canCreate } = usePermission("sales", "create");
  const { hasPermission: canExport } = usePermission("sales", "export");
  
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Sales Orders</h1>
        
        <div className="actions">
          <Can resource="sales" action="create">
            <Button onClick={handleCreate}>
              Create New Order
            </Button>
          </Can>
          
          <Can resource="sales" action="export">
            <Button onClick={handleExport}>
              Export to Excel
            </Button>
          </Can>
        </div>
      </div>
      
      <SalesOrderTable />
    </div>
  );
}
```

---

## Example 4: Sales Order Table with Row Actions

```tsx
// src/components/sales/SalesOrderTable.tsx
import { Can } from "@/components/rbac/Can";

function SalesOrderRow({ order }) {
  return (
    <tr>
      <td>{order.orderNumber}</td>
      <td>{order.customer.name}</td>
      <td>{order.totalAmount}</td>
      <td>
        <div className="actions">
          <Can resource="sales" action="read">
            <Button href={`/sales-orders/${order.id}`}>
              View
            </Button>
          </Can>
          
          <Can resource="sales" action="update">
            <Button href={`/sales-orders/${order.id}/edit`}>
              Edit
            </Button>
          </Can>
          
          <Can resource="sales" action="delete">
            <Button 
              variant="danger"
              onClick={() => handleDelete(order.id)}
            >
              Delete
            </Button>
          </Can>
          
          <Can resource="sales" action="email">
            <Button onClick={() => handleSendEmail(order.id)}>
              Send Email
            </Button>
          </Can>
        </div>
      </td>
    </tr>
  );
}
```

---

## Example 5: Dynamic Sidebar Menu

```tsx
// src/components/layout/Sidebar.tsx
import { Can } from "@/components/rbac/Can";

export function Sidebar() {
  return (
    <nav className="sidebar">
      <Can resource="sales" action="read">
        <MenuItem href="/sales" icon={<ShoppingCart />}>
          Sales
        </MenuItem>
      </Can>
      
      <Can resource="purchase" action="read">
        <MenuItem href="/purchase" icon={<Package />}>
          Purchase
        </MenuItem>
      </Can>
      
      <Can resource="inventory" action="read">
        <MenuItem href="/inventory" icon={<Warehouse />}>
          Inventory
        </MenuItem>
      </Can>
      
      <Can resource="customers" action="read">
        <MenuItem href="/customers" icon={<Users />}>
          Customers
        </MenuItem>
      </Can>
      
      <Can resource="reports" action="read">
        <MenuItem href="/reports" icon={<BarChart />}>
          Reports
        </MenuItem>
      </Can>
      
      <Can resource="roles" action="manage">
        <MenuItem href="/settings/roles" icon={<Shield />}>
          Role Management
        </MenuItem>
      </Can>
    </nav>
  );
}
```

---

## Example 6: Role Management Page (Admin UI)

```tsx
// src/app/(features)/(settings)/roles/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Can } from "@/components/rbac/Can";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRoles();
  }, []);
  
  async function fetchRoles() {
    const res = await fetch("/api/rbac/roles");
    const data = await res.json();
    setRoles(data.roles);
    setLoading(false);
  }
  
  async function handleDelete(roleId: string) {
    if (!confirm("Are you sure?")) return;
    
    await fetch(`/api/rbac/roles/${roleId}`, {
      method: "DELETE",
    });
    
    fetchRoles();
  }
  
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Role Management</h1>
        
        <Can resource="roles" action="create">
          <Button href="/settings/roles/create">
            Create New Role
          </Button>
        </Can>
      </div>
      
      <table className="table">
        <thead>
          <tr>
            <th>Role Name</th>
            <th>Description</th>
            <th>Users</th>
            <th>System Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>{role.displayName}</td>
              <td>{role.description}</td>
              <td>{role._count.users}</td>
              <td>{role.isSystemRole ? "Yes" : "No"}</td>
              <td>
                <Can resource="roles" action="read">
                  <Button href={`/settings/roles/${role.id}`}>
                    View
                  </Button>
                </Can>
                
                {!role.isSystemRole && (
                  <>
                    <Can resource="roles" action="update">
                      <Button href={`/settings/roles/${role.id}/edit`}>
                        Edit
                      </Button>
                    </Can>
                    
                    <Can resource="roles" action="delete">
                      <Button 
                        variant="danger"
                        onClick={() => handleDelete(role.id)}
                        disabled={role._count.users > 0}
                      >
                        Delete
                      </Button>
                    </Can>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Example 7: Create/Edit Role Form

```tsx
// src/app/(features)/(settings)/roles/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditRolePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  useEffect(() => {
    fetchRole();
    fetchPermissions();
  }, []);
  
  async function fetchRole() {
    const res = await fetch(`/api/rbac/roles/${params.id}`);
    const data = await res.json();
    setRole(data.role);
    setSelectedPermissions(
      data.role.rolePermissions.map((rp) => rp.permissionId)
    );
  }
  
  async function fetchPermissions() {
    const res = await fetch("/api/rbac/permissions");
    const data = await res.json();
    setPermissions(data.grouped);
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    await fetch(`/api/rbac/roles/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: role.displayName,
        description: role.description,
        permissionIds: selectedPermissions,
      }),
    });
    
    router.push("/settings/roles");
  }
  
  function togglePermission(permissionId: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  }
  
  if (!role) return <div>Loading...</div>;
  
  return (
    <div className="page-wrapper">
      <h1>Edit Role: {role.displayName}</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Display Name</label>
          <input
            type="text"
            value={role.displayName}
            onChange={(e) => setRole({ ...role, displayName: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={role.description || ""}
            onChange={(e) => setRole({ ...role, description: e.target.value })}
          />
        </div>
        
        <div className="permissions-matrix">
          <h3>Permissions</h3>
          
          {Object.entries(permissions).map(([resource, perms]) => (
            <div key={resource} className="permission-group">
              <h4>{resource}</h4>
              
              <div className="permission-checkboxes">
                {perms.map((perm) => (
                  <label key={perm.id}>
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    {perm.action}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="form-actions">
          <Button type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## Example 8: User Management with Role Assignment

```tsx
// src/app/(features)/(settings)/users/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function EditUserPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  
  useEffect(() => {
    fetchUser();
    fetchRoles();
  }, []);
  
  async function fetchUser() {
    const res = await fetch(`/api/users/${params.id}`);
    const data = await res.json();
    setUser(data.user);
  }
  
  async function fetchRoles() {
    const res = await fetch("/api/rbac/roles");
    const data = await res.json();
    setRoles(data.roles);
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    await fetch(`/api/users/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roleId: user.roleId, // Assign custom role
        isActive: user.isActive,
      }),
    });
    
    router.push("/settings/users");
  }
  
  if (!user) return <div>Loading...</div>;
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={user.email}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
        />
      </div>
      
      <div className="form-group">
        <label>Assign Role</label>
        <select
          value={user.roleId || ""}
          onChange={(e) => setUser({ ...user, roleId: e.target.value || null })}
        >
          <option value="">Use Default Role ({user.role})</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.displayName}
            </option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={user.isActive}
            onChange={(e) => setUser({ ...user, isActive: e.target.checked })}
          />
          Active
        </label>
      </div>
      
      <Button type="submit">Save Changes</Button>
    </form>
  );
}
```

---

## Example 9: Conditional Features Based on Permissions

```tsx
// src/components/sales/SalesOrderDetail.tsx
import { usePermission } from "@/hooks/usePermission";

export function SalesOrderDetail({ order }) {
  const { hasPermission: canApprove } = usePermission("sales", "approve");
  const { hasPermission: canEmail } = usePermission("sales", "email");
  const { hasPermission: canUpdate } = usePermission("sales", "update");
  
  return (
    <div>
      <h1>Sales Order #{order.orderNumber}</h1>
      
      {order.status === "DRAFT" && canApprove && (
        <Button onClick={handleApprove}>
          Approve Order
        </Button>
      )}
      
      {canEmail && (
        <Button onClick={handleSendEmail}>
          Send to Customer
        </Button>
      )}
      
      {canUpdate && (
        <Button href={`/sales-orders/${order.id}/edit`}>
          Edit Order
        </Button>
      )}
      
      {/* Order details */}
    </div>
  );
}
```

---

## Example 10: Protecting Multiple Actions

```tsx
// src/app/api/sales-orders/[id]/approve/route.ts
import { requireAllPermissions } from "@/lib/rbac/middleware";
import { auditLog } from "@/lib/rbac/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require both read and approve permissions
  const { authorized, user } = await requireAllPermissions(request, [
    { resource: "sales", action: "read" },
    { resource: "sales", action: "approve" },
  ]);
  
  if (!authorized) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }
  
  const order = await prisma.salesOrder.update({
    where: { id: params.id },
    data: {
      status: "CONFIRMED",
      approvedBy: user.id,
      approvedAt: new Date(),
    },
  });
  
  // Log approval
  await auditLog.custom({
    userId: user.id,
    action: "sales.approved",
    resource: "sales_order",
    resourceId: order.id,
    description: `Approved sales order ${order.orderNumber}`,
  });
  
  return NextResponse.json({ order });
}
```

These examples demonstrate the complete RBAC implementation across your application!

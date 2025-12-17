import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

// Define all permissions by module
const PERMISSIONS = [
  // Sales module
  { resource: "sales", action: "read", description: "View sales orders and invoices" },
  { resource: "sales", action: "create", description: "Create new sales orders" },
  { resource: "sales", action: "update", description: "Edit sales orders" },
  { resource: "sales", action: "delete", description: "Delete sales orders" },
  { resource: "sales", action: "approve", description: "Approve sales orders" },
  { resource: "sales", action: "email", description: "Send sales emails" },
  { resource: "sales", action: "export", description: "Export sales data" },

  // Purchase module
  { resource: "purchase", action: "read", description: "View purchase orders" },
  { resource: "purchase", action: "create", description: "Create purchase orders" },
  { resource: "purchase", action: "update", description: "Edit purchase orders" },
  { resource: "purchase", action: "delete", description: "Delete purchase orders" },
  { resource: "purchase", action: "approve", description: "Approve purchase orders" },
  { resource: "purchase", action: "email", description: "Send purchase emails" },
  { resource: "purchase", action: "export", description: "Export purchase data" },

  // Inventory module
  { resource: "inventory", action: "read", description: "View inventory" },
  { resource: "inventory", action: "create", description: "Add inventory items" },
  { resource: "inventory", action: "update", description: "Update inventory" },
  { resource: "inventory", action: "delete", description: "Delete inventory items" },
  { resource: "inventory", action: "adjust", description: "Adjust stock levels" },
  { resource: "inventory", action: "export", description: "Export inventory data" },

  // Customers module
  { resource: "customers", action: "read", description: "View customers" },
  { resource: "customers", action: "create", description: "Add new customers" },
  { resource: "customers", action: "update", description: "Edit customer details" },
  { resource: "customers", action: "delete", description: "Delete customers" },
  { resource: "customers", action: "export", description: "Export customer data" },

  // Vendors/Suppliers module
  { resource: "vendors", action: "read", description: "View vendors" },
  { resource: "vendors", action: "create", description: "Add new vendors" },
  { resource: "vendors", action: "update", description: "Edit vendor details" },
  { resource: "vendors", action: "delete", description: "Delete vendors" },
  { resource: "vendors", action: "export", description: "Export vendor data" },

  // Packages module
  { resource: "packages", action: "read", description: "View packages" },
  { resource: "packages", action: "create", description: "Create packages" },
  { resource: "packages", action: "update", description: "Edit packages" },
  { resource: "packages", action: "delete", description: "Delete packages" },

  // Shipments module
  { resource: "shipments", action: "read", description: "View shipments" },
  { resource: "shipments", action: "create", description: "Create shipments" },
  { resource: "shipments", action: "update", description: "Update shipments" },
  { resource: "shipments", action: "delete", description: "Delete shipments" },

  // Payments module
  { resource: "payments", action: "read", description: "View payments" },
  { resource: "payments", action: "create", description: "Record payments" },
  { resource: "payments", action: "update", description: "Edit payments" },
  { resource: "payments", action: "delete", description: "Delete payments" },
  { resource: "payments", action: "export", description: "Export payment data" },

  // Reports module
  { resource: "reports", action: "read", description: "View reports" },
  { resource: "reports", action: "export", description: "Export reports" },

  // Users module
  { resource: "users", action: "read", description: "View users" },
  { resource: "users", action: "create", description: "Create users" },
  { resource: "users", action: "update", description: "Edit users" },
  { resource: "users", action: "delete", description: "Delete users" },
  { resource: "users", action: "manage", description: "Full user management" },

  // Roles module
  { resource: "roles", action: "read", description: "View roles" },
  { resource: "roles", action: "create", description: "Create roles" },
  { resource: "roles", action: "update", description: "Edit roles" },
  { resource: "roles", action: "delete", description: "Delete roles" },
  { resource: "roles", action: "manage", description: "Full role management" },

  // Settings module
  { resource: "settings", action: "read", description: "View settings" },
  { resource: "settings", action: "update", description: "Update settings" },
  { resource: "settings", action: "manage", description: "Full settings management" },

  // Products module
  { resource: "products", action: "read", description: "View products" },
  { resource: "products", action: "create", description: "Create products" },
  { resource: "products", action: "update", description: "Edit products" },
  { resource: "products", action: "delete", description: "Delete products" },
  { resource: "products", action: "export", description: "Export product data" },

  // Stores module
  { resource: "stores", action: "read", description: "View stores" },
  { resource: "stores", action: "create", description: "Create stores" },
  { resource: "stores", action: "update", description: "Edit stores" },
  { resource: "stores", action: "delete", description: "Delete stores" },
];

// Define system roles with their permission mappings
const SYSTEM_ROLES = [
  {
    name: "SUPER_ADMIN",
    displayName: "Super Administrator",
    description: "Full system access with all permissions",
    isSystemRole: true,
    permissions: "*", // All permissions
  },
  {
    name: "ADMIN",
    displayName: "Administrator",
    description: "Administrative access to most modules",
    isSystemRole: true,
    permissions: [
      // Sales
      "sales.read", "sales.create", "sales.update", "sales.delete", "sales.approve", "sales.email", "sales.export",
      // Purchase
      "purchase.read", "purchase.create", "purchase.update", "purchase.delete", "purchase.approve", "purchase.email", "purchase.export",
      // Inventory
      "inventory.read", "inventory.create", "inventory.update", "inventory.delete", "inventory.adjust", "inventory.export",
      // Customers
      "customers.read", "customers.create", "customers.update", "customers.delete", "customers.export",
      // Vendors
      "vendors.read", "vendors.create", "vendors.update", "vendors.delete", "vendors.export",
      // Packages & Shipments
      "packages.read", "packages.create", "packages.update", "packages.delete",
      "shipments.read", "shipments.create", "shipments.update", "shipments.delete",
      // Payments
      "payments.read", "payments.create", "payments.update", "payments.delete", "payments.export",
      // Reports
      "reports.read", "reports.export",
      // Users (limited)
      "users.read", "users.create", "users.update",
      // Products
      "products.read", "products.create", "products.update", "products.delete", "products.export",
      // Stores
      "stores.read", "stores.create", "stores.update",
      // Settings (read only)
      "settings.read",
    ],
  },
  {
    name: "MANAGER",
    displayName: "Manager",
    description: "Operational management access",
    isSystemRole: true,
    permissions: [
      // Sales
      "sales.read", "sales.create", "sales.update", "sales.email", "sales.export",
      // Purchase
      "purchase.read", "purchase.create", "purchase.update", "purchase.email", "purchase.export",
      // Inventory
      "inventory.read", "inventory.create", "inventory.update", "inventory.adjust", "inventory.export",
      // Customers
      "customers.read", "customers.create", "customers.update", "customers.export",
      // Vendors
      "vendors.read", "vendors.create", "vendors.update", "vendors.export",
      // Packages & Shipments
      "packages.read", "packages.create", "packages.update",
      "shipments.read", "shipments.create", "shipments.update",
      // Payments
      "payments.read", "payments.create", "payments.export",
      // Reports
      "reports.read", "reports.export",
      // Products
      "products.read", "products.create", "products.update", "products.export",
      // Stores
      "stores.read",
    ],
  },
  {
    name: "STAFF",
    displayName: "Staff",
    description: "Limited operational access",
    isSystemRole: true,
    permissions: [
      // Sales
      "sales.read", "sales.create", "sales.update",
      // Purchase
      "purchase.read", "purchase.create",
      // Inventory
      "inventory.read", "inventory.update",
      // Customers
      "customers.read", "customers.create", "customers.update",
      // Vendors
      "vendors.read",
      // Packages & Shipments
      "packages.read", "packages.create",
      "shipments.read",
      // Payments
      "payments.read",
      // Products
      "products.read", "products.create", "products.update",
      // Reports
      "reports.read",
    ],
  },
  {
    name: "CASHIER",
    displayName: "Cashier",
    description: "Point of sale and payment access only",
    isSystemRole: true,
    permissions: [
      // Sales (POS focused)
      "sales.read", "sales.create",
      // Customers (basic)
      "customers.read", "customers.create",
      // Payments
      "payments.read", "payments.create",
      // Products (read only)
      "products.read",
      // Inventory (read only)
      "inventory.read",
    ],
  },
];

async function seedRBAC() {
  console.log("🌱 Starting RBAC seed...");

  try {
    // 1. Create all permissions
    console.log("📝 Creating permissions...");
    const createdPermissions = [];
    for (const perm of PERMISSIONS) {
      const permission = await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {
          description: perm.description,
        },
        create: perm,
      });
      createdPermissions.push(permission);
    }
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // 2. Create system roles and assign permissions
    console.log("👥 Creating system roles...");
    for (const roleData of SYSTEM_ROLES) {
      const { permissions: rolePermissions, ...roleInfo } = roleData;

      // Create or update role
      const role = await prisma.role.upsert({
        where: { name: roleInfo.name },
        update: {
          displayName: roleInfo.displayName,
          description: roleInfo.description,
        },
        create: roleInfo,
      });

      // Determine which permissions to assign
      let permissionsToAssign: typeof createdPermissions = [];
      if (rolePermissions === "*") {
        // Super admin gets all permissions
        permissionsToAssign = createdPermissions;
      } else {
        // Filter permissions based on role's permission list
        permissionsToAssign = createdPermissions.filter((p) =>
          (rolePermissions as string[]).includes(`${p.resource}.${p.action}`)
        );
      }

      // Delete existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      // Create new role permissions
      for (const permission of permissionsToAssign) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }

      console.log(`✅ Created role: ${role.displayName} with ${permissionsToAssign.length} permissions`);
    }

    console.log("✨ RBAC seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding RBAC:", error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seedRBAC()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedRBAC };

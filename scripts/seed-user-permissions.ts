import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedUserPermissions() {
  console.log("🌱 Seeding user management permissions...");

  try {
    // Create user management permissions
    const userPermissions = [
      { resource: "users", action: "create", description: "Invite new users" },
      { resource: "users", action: "read", description: "View users list" },
      { resource: "users", action: "update", description: "Update user status and details" },
      { resource: "users", action: "delete", description: "Remove users" },
    ];

    for (const perm of userPermissions) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {},
        create: perm,
      });
      console.log(`✅ Created permission: ${perm.resource}.${perm.action}`);
    }

    // Assign all user permissions to SUPER_ADMIN role
    const superAdminRole = await prisma.role.findFirst({
      where: { name: "SUPER_ADMIN" },
    });

    if (superAdminRole) {
      const permissions = await prisma.permission.findMany({
        where: { resource: "users" },
      });

      for (const permission of permissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`✅ Assigned user permissions to SUPER_ADMIN role`);
    }

    // Assign read permission to ADMIN role
    const adminRole = await prisma.role.findFirst({
      where: { name: "ADMIN" },
    });

    if (adminRole) {
      const readPermission = await prisma.permission.findFirst({
        where: { resource: "users", action: "read" },
      });

      if (readPermission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: readPermission.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: readPermission.id,
          },
        });
        console.log(`✅ Assigned read permission to ADMIN role`);
      }
    }

    console.log("✅ User management permissions seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedUserPermissions()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

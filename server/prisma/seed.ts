import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const roles = [
  {
    name: "Organization Admin",
    description: "Full administrative access to the organization.",
  },
  {
    name: "Content Creator",
    description: "Creates and manages content drafts.",
  },
  {
    name: "Reviewer",
    description: "Reviews content before approval.",
  },
  {
    name: "Approver",
    description: "Approves content for publishing.",
  },
  {
    name: "Social Media Manager",
    description: "Publishes approved content to social channels.",
  },
];

const permissions = [
  {
    name: "organization.read",
    description: "View organization information.",
    resource: "organization",
    action: "read",
  },
  {
    name: "organization.update",
    description: "Update organization information.",
    resource: "organization",
    action: "update",
  },
  {
    name: "organization.users.manage",
    description: "Invite, remove, and manage organization users.",
    resource: "organization.users",
    action: "manage",
  },
  {
    name: "organization.roles.manage",
    description: "Manage organization roles and role assignments.",
    resource: "organization.roles",
    action: "manage",
  },
  {
    name: "workspace.read",
    description: "View workspace information.",
    resource: "workspace",
    action: "read",
  },
  {
    name: "workspace.manage",
    description: "Manage workspace configuration and membership.",
    resource: "workspace",
    action: "manage",
  },
  {
    name: "content.create",
    description: "Create content.",
    resource: "content",
    action: "create",
  },
  {
    name: "content.read",
    description: "View content.",
    resource: "content",
    action: "read",
  },
  {
    name: "content.review",
    description: "Review content.",
    resource: "content",
    action: "review",
  },
  {
    name: "content.approve",
    description: "Approve content for publishing.",
    resource: "content",
    action: "approve",
  },
  {
    name: "content.publish",
    description: "Publish approved content.",
    resource: "content",
    action: "publish",
  },
];

const rolePermissions: Record<string, string[]> = {
  "Organization Admin": [
    "organization.read",
    "organization.update",
    "organization.users.manage",
    "organization.roles.manage",
    "workspace.read",
    "workspace.manage",
    "content.create",
    "content.read",
    "content.review",
    "content.approve",
    "content.publish",
  ],

  "Content Creator": [
    "content.create",
    "content.read",
  ],

  Reviewer: [
    "content.read",
    "content.review",
  ],

  Approver: [
    "content.read",
    "content.approve",
  ],

  "Social Media Manager": [
    "content.read",
    "content.publish",
  ],
};

async function main() {
  console.log("Starting DiraFlow RBAC seed...");

  // Create/update permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        name: permission.name,
      },
      update: {
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      },
      create: permission,
    });
  }

  console.log(`✓ ${permissions.length} permissions ready`);

  // Create/update roles
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  console.log(`✓ ${roles.length} roles ready`);

  // Connect roles to permissions
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({
      where: {
        name: roleName,
      },
    });

    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUnique({
        where: {
          name: permissionName,
        },
      });

      if (!permission) {
        throw new Error(`Permission not found: ${permissionName}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("✓ Role-permission mappings ready");
  console.log("DiraFlow RBAC seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("RBAC seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
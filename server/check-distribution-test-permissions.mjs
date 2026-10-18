import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

const emails = [
  "test.creator@diraflow.local",
  "test.reviewer@diraflow.local",
  "test.approver@diraflow.local",
  "test.publisher@diraflow.local",
];

const required = [
  "content.create",
  "content.review",
  "content.approve",
  "content.publish",
];

try {
  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        isActive: true,
        userRoles: {
          select: {
            workspaceId: true,
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log(`${email}: NOT FOUND`);
      continue;
    }

    const roles = user.userRoles.map(item => ({
      role: item.role.name,
      workspaceId: item.workspaceId ?? "GLOBAL",
      permissions: item.role.permissions.map(
        item => item.permission.name
      )
    }));

    const allPermissions = new Set(
      roles.flatMap(item => item.permissions)
    );

    console.log(JSON.stringify({
      email: user.email,
      active: user.isActive,
      roles,
      requiredPermissions: Object.fromEntries(
        required.map(name => [
          name,
          allPermissions.has(name)
        ])
      )
    }));
  }
} finally {
  await prisma.$disconnect();
}

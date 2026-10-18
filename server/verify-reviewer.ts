import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const user = await prisma.user.findUnique({
  where: { email: "test.reviewer@diraflow.local" },
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    },
    organizationMemberships: true,
    workspaceMemberships: true
  }
});

console.log(JSON.stringify({
  userId: user?.id,
  email: user?.email,
  organizationMemberships: user?.organizationMemberships,
  workspaceMemberships: user?.workspaceMemberships,
  roles: user?.userRoles?.map((ur) => ({
    role: ur.role.name,
    workspaceId: ur.workspaceId,
    permissions: ur.role.permissions.map((rp) => rp.permission.name)
  }))
}, null, 2));

await prisma.$disconnect();

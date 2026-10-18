import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const user = await prisma.user.findUnique({
  where: { email: "test.publisher@diraflow.local" },
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
    }
  }
});

console.log(JSON.stringify({
  id: user?.id,
  email: user?.email,
  roles: user?.userRoles?.map((ur) => ({
    role: ur.role.name,
    workspaceId: ur.workspaceId,
    permissions: ur.role.permissions.map((rp) => rp.permission.name)
  }))
}, null, 2));

await prisma.$disconnect();

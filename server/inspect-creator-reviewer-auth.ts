import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const emails = [
  "test.creator@diraflow.local",
  "test.reviewer@diraflow.local"
];

for (const email of emails) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      organizationMemberships: {
        select: {
          organizationId: true
        }
      },
      workspaceMemberships: {
        select: {
          workspaceId: true
        }
      },
      userRoles: {
        select: {
          role: {
            select: {
              name: true
            }
          },
          workspaceId: true
        }
      }
    }
  });

  console.log(JSON.stringify(user, null, 2));
}

await prisma.$disconnect();

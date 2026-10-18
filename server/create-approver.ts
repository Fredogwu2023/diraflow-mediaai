import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const email = "test.approver@diraflow.local";
const password = "Approver123!";

const organizationId = "cmtbmnka50000a0uh9kip5ksj";
const workspaceId = "cmtbmq41b0000m0uha2q8uhcm";
const approverRoleId = "cmtabe8va000ex0uhqww38rwu";

const existing = await prisma.user.findUnique({
  where: { email }
});

if (existing) {
  console.log(`Approver account already exists: ${existing.id}`);
} else {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Test",
      lastName: "Approver",
      isActive: true,
      organizationMemberships: {
        create: {
          organizationId
        }
      },
      workspaceMemberships: {
        create: {
          workspaceId
        }
      },
      userRoles: {
        create: {
          roleId: approverRoleId,
          workspaceId
        }
      }
    }
  });

  console.log(JSON.stringify({
    success: true,
    userId: user.id,
    email: user.email,
    role: "Approver",
    organizationId,
    workspaceId
  }, null, 2));
}

await prisma.$disconnect();

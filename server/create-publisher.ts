import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import bcrypt from "bcrypt";
const { prisma } = await import("./src/lib/prisma.js");

const email = "test.publisher@diraflow.local";
const password = "Publisher123!";
const roleId = "cmtabe8vc000fx0uhenym2v4g";
const organizationId = "cmtbmnka50000a0uh9kip5ksj";
const workspaceId = "cmtbmq41b0000m0uha2q8uhcm";

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  update: {
    passwordHash,
    firstName: "Test",
    lastName: "Publisher",
    isActive: true
  },
  create: {
    email,
    passwordHash,
    firstName: "Test",
    lastName: "Publisher",
    isActive: true
  }
});

await prisma.organizationMember.upsert({
  where: {
    organizationId_userId: {
      organizationId,
      userId: user.id
    }
  },
  update: {},
  create: {
    organizationId,
    userId: user.id
  }
});

await prisma.workspaceMember.upsert({
  where: {
    workspaceId_userId: {
      workspaceId,
      userId: user.id
    }
  },
  update: {},
  create: {
    workspaceId,
    userId: user.id
  }
});

const existingUserRole = await prisma.userRole.findFirst({
  where: {
    userId: user.id,
    roleId,
    workspaceId
  }
});

if (!existingUserRole) {
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId,
      workspaceId
    }
  });
}

console.log(JSON.stringify({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  roleId,
  organizationId,
  workspaceId
}, null, 2));

await prisma.$disconnect();

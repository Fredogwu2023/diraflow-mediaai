import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const user = await prisma.user.findUnique({
  where: { email: "test.creator@diraflow.local" },
  include: {
    organizationMemberships: true,
    workspaceMemberships: true
  }
});

const reviewerRole = await prisma.role.findUnique({
  where: { name: "Reviewer" }
});

console.log(JSON.stringify({
  userId: user?.id,
  organizationMemberships: user?.organizationMemberships,
  workspaceMemberships: user?.workspaceMemberships,
  reviewerRole
}, null, 2));

await prisma.$disconnect();

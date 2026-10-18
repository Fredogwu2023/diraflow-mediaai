import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const emails = [
    "test.creator@diraflow.local",
    "test.reviewer@diraflow.local",
    "test.approver@diraflow.local",
    "test.publisher@diraflow.local",
  ];

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      email: true,
      isActive: true,
      userRoles: {
        select: { role: { select: { name: true } } },
      },
    },
  });

  console.log("=== EXISTING TEST USERS ===");
  for (const email of emails) {
    const user = users.find((item) => item.email === email);
    console.log({
      email,
      exists: Boolean(user),
      active: user?.isActive ?? null,
      roles: user?.userRoles?.map((item) => item.role.name) ?? [],
    });
  }
} finally {
  await prisma.$disconnect();
}

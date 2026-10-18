import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const now = new Date();

  const deliveries = await prisma.distributionDelivery.findMany({
    where: {
      status: "QUEUED",
      scheduledAt: { lte: now },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: now } }
      ],
      plan: {
        status: { in: ["QUEUED", "ACTIVE"] },
        content: { status: "APPROVED" }
      }
    },
    select: {
      id: true,
      planId: true,
      platform: true,
      scheduledAt: true,
      nextAttemptAt: true,
      plan: {
        select: {
          status: true,
          content: { select: { status: true } }
        }
      }
    },
    orderBy: { scheduledAt: "asc" },
    take: 25
  });

  console.log(JSON.stringify({
    test: "read_only_distribution_preflight",
    checkedAt: now.toISOString(),
    eligibleCountReturned: deliveries.length,
    limit: 25,
    eligibleDeliveries: deliveries
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

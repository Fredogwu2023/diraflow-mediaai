import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const now = new Date();

  const deliveries = await prisma.distributionDelivery.findMany({
    where: {
      status: "QUEUED",
      scheduledAt: { lte: now },
      plan: {
        status: { in: ["QUEUED", "ACTIVE"] },
        content: { status: "APPROVED" },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 20,
    select: {
      id: true,
      platform: true,
      occurrenceNumber: true,
      scheduledAt: true,
      status: true,
      attemptCount: true,
      plan: {
        select: {
          id: true,
          status: true,
          timezone: true,
          content: {
            select: {
              id: true,
              title: true,
              status: true,
              type: true,
            },
          },
        },
      },
    },
  });

  console.log("\n=== DISTRIBUTION WORKER DRY RUN ===");
  console.log("Checked at:", now.toISOString());
  console.log("Eligible queued deliveries found:", deliveries.length);

  for (const delivery of deliveries) {
    console.log(JSON.stringify({
      deliveryId: delivery.id,
      platform: delivery.platform,
      occurrence: delivery.occurrenceNumber,
      scheduledAt: delivery.scheduledAt.toISOString(),
      deliveryStatus: delivery.status,
      attempts: delivery.attemptCount,
      planId: delivery.plan.id,
      planStatus: delivery.plan.status,
      contentId: delivery.plan.content.id,
      contentTitle: delivery.plan.content.title,
      contentStatus: delivery.plan.content.status,
      contentType: delivery.plan.content.type,
      timezone: delivery.plan.timezone,
      adapterConfigured: false,
      action: "DRY_RUN_ONLY_NO_STATE_CHANGE",
    }, null, 2));
  }
} catch (error) {
  console.error("Dry-run failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

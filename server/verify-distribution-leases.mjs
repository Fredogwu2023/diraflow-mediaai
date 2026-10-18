import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const deliveries = await prisma.distributionDelivery.findMany({
    where: {
      OR: [
        { status: "PROCESSING" },
        { processingLeaseExpiresAt: { not: null } },
        { claimToken: { not: null } },
      ],
    },
    select: {
      id: true,
      planId: true,
      platform: true,
      status: true,
      attemptCount: true,
      processingStartedAt: true,
      processingLeaseExpiresAt: true,
      claimToken: true,
      nextAttemptAt: true,
      lastError: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  console.log(JSON.stringify({
    inspectedAt: new Date().toISOString(),
    count: deliveries.length,
    deliveries: deliveries.map(({ claimToken, ...delivery }) => ({
      ...delivery,
      claimTokenPresent: Boolean(claimToken),
    })),
  }, null, 2));
} catch (error) {
  console.error("Read-only lease inspection failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

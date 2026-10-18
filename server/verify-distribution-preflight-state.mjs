import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

const deliveryId = "cmv5o1495000ao0uh5onx6ywq";

try {
  const now = new Date();

  const where = {
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
  };

  const [eligibleCount, delivery] = await Promise.all([
    prisma.distributionDelivery.count({ where }),
    prisma.distributionDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        status: true,
        attemptCount: true,
        processingStartedAt: true,
        processingLeaseExpiresAt: true,
        claimToken: true,
        nextAttemptAt: true,
        plan: {
          select: {
            id: true,
            status: true,
            content: {
              select: { id: true, status: true }
            }
          }
        }
      }
    })
  ]);

  console.log(JSON.stringify({
    test: "read_only_distribution_state_verification",
    checkedAt: now.toISOString(),
    eligibleCount,
    existingDelivery: delivery ? {
      ...delivery,
      claimTokenPresent: Boolean(delivery.claimToken),
      claimToken: undefined
    } : null,
    safeToProceedToTestDesignReview:
      eligibleCount === 1 &&
      delivery?.status === "QUEUED" &&
      delivery?.attemptCount === 0 &&
      delivery?.processingStartedAt === null &&
      delivery?.processingLeaseExpiresAt === null &&
      !delivery?.claimToken &&
      delivery?.plan?.status === "QUEUED" &&
      delivery?.plan?.content?.status === "APPROVED"
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

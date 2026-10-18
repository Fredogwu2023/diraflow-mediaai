import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

const id = "cmv5o1495000ao0uh5onx6ywq";

try {
  const delivery = await prisma.distributionDelivery.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      attemptCount: true,
      processingStartedAt: true,
      processingLeaseExpiresAt: true,
      claimToken: true,
      nextAttemptAt: true,
      lastError: true,
    },
  });

  if (!delivery) {
    throw new Error("Expected test delivery was not found.");
  }

  const safeResult = {
    ...delivery,
    claimTokenPresent: Boolean(delivery.claimToken),
  };
  delete safeResult.claimToken;

  console.log(JSON.stringify(safeResult, null, 2));

  if (
    delivery.status !== "QUEUED" ||
    delivery.processingStartedAt !== null ||
    delivery.processingLeaseExpiresAt !== null ||
    delivery.claimToken !== null
  ) {
    throw new Error("Delivery is not in the expected post-rollback state.");
  }

  console.log("PASS: delivery remains queued with no persisted lease.");
} catch (error) {
  console.error("Post-rollback verification failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

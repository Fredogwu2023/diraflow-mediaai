import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";
import { claimDueDeliveries } from "./src/services/distribution-claim.service.js";

const ROLLBACK_MARKER = "INTENTIONAL_CLAIM_TEST_ROLLBACK";

try {
  let proposedClaims = [];

  try {
    await prisma.$transaction(async (tx) => {
      proposedClaims = await claimDueDeliveries(tx, {
        now: new Date(),
        limit: 50,
        leaseMs: 5 * 60 * 1000,
      });

      // Deliberately roll back every claim made by this test.
      throw new Error(ROLLBACK_MARKER);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_MARKER) {
      throw error;
    }
  }

  const ids = proposedClaims.map((item) => item.id);

  const afterRollback = ids.length
    ? await prisma.distributionDelivery.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          status: true,
          attemptCount: true,
          processingStartedAt: true,
          processingLeaseExpiresAt: true,
          claimToken: true,
        },
      })
    : [];

  const leakedChanges = afterRollback.filter((item) =>
    item.status === "PROCESSING" ||
    item.processingStartedAt !== null ||
    item.processingLeaseExpiresAt !== null ||
    item.claimToken !== null
  );

  console.log(JSON.stringify({
    test: "atomic_distribution_claim_rollback",
    proposedClaimCount: proposedClaims.length,
    proposedClaimIds: ids,
    rollbackVerified: leakedChanges.length === 0,
    persistedLeaseChanges: leakedChanges.length,
  }, null, 2));

  if (leakedChanges.length > 0) {
    throw new Error("Claim test left persisted lease changes in the database.");
  }
} catch (error) {
  console.error("Claim verification failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

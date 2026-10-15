const DEFAULT_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000;

function getRetryDelayMs(attemptCount) {
  const exponent = Math.max(0, attemptCount - 1);
  return Math.min(
    BASE_RETRY_DELAY_MS * (2 ** exponent),
    MAX_RETRY_DELAY_MS
  );
}

export async function recoverExpiredDeliveries(
  tx,
  { now = new Date(), limit = DEFAULT_BATCH_SIZE } = {}
) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("now must be a valid Date");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > DEFAULT_BATCH_SIZE) {
    throw new RangeError(`limit must be an integer from 1 to ${DEFAULT_BATCH_SIZE}`);
  }

  const candidatePlans = await tx.$queryRaw`
    SELECT DISTINCT batch."planId"
    FROM (
      SELECT d."planId", d."processingLeaseExpiresAt", d."id"
      FROM "DistributionDelivery" AS d
      WHERE d."status" = 'PROCESSING'
        AND d."processingLeaseExpiresAt" IS NOT NULL
        AND d."processingLeaseExpiresAt" <= ${now}
      ORDER BY d."processingLeaseExpiresAt" ASC, d."id" ASC
      LIMIT ${limit}
    ) AS batch
    ORDER BY batch."planId" ASC
  `;

  const planIds = [...new Set(candidatePlans.map(row => row.planId))].sort();

  if (planIds.length === 0) {
    return [];
  }

  // Use the same plan-level advisory lock as claiming and completion.
  for (const planId of planIds) {
    await tx.$queryRaw`
      WITH lock_result AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${planId}, 0))
      )
      SELECT TRUE AS "locked" FROM lock_result
    `;
  }

  const candidates = await tx.$queryRaw`
    SELECT
      d."id",
      d."planId",
      d."claimToken",
      d."processingLeaseExpiresAt",
      d."attemptCount"
    FROM "DistributionDelivery" AS d
    WHERE d."planId" = ANY(${planIds}::text[])
      AND d."status" = 'PROCESSING'
      AND d."processingLeaseExpiresAt" IS NOT NULL
      AND d."processingLeaseExpiresAt" <= ${now}
    ORDER BY d."processingLeaseExpiresAt" ASC, d."id" ASC
    LIMIT ${limit}
    FOR UPDATE OF d SKIP LOCKED
  `;

  const recovered = [];
  for (const candidate of candidates) {
    const lastError =
      "Processing lease expired; external publishing outcome is unknown. " +
      "Reconcile with the platform before retrying.";

    const result = await tx.distributionDelivery.updateMany({
      where: {
        id: candidate.id,
        status: "PROCESSING",
        claimToken: candidate.claimToken,
        processingLeaseExpiresAt: { lte: now },
        attemptCount: candidate.attemptCount,
      },
      data: {
        status: "RECONCILIATION_REQUIRED",
        processingStartedAt: null,
        processingLeaseExpiresAt: null,
        claimToken: null,
        nextAttemptAt: null,
        lastError,
      },
    });

    if (result.count === 1) {
      recovered.push({
        id: candidate.id,
        status: "RECONCILIATION_REQUIRED",
        nextAttemptAt: null,
      });
    }
  }
  return recovered;
}

import { randomUUID } from "node:crypto";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_LEASE_MS = 5 * 60 * 1000;

/**
 * Claims due deliveries inside a caller-owned Prisma transaction.
 * Acquires shared plan advisory locks before locking delivery rows.
 * The caller controls commit/rollback. This function never publishes.
 */
export async function claimDueDeliveries(
  tx,
  {
    now = new Date(),
    limit = DEFAULT_BATCH_SIZE,
    leaseMs = DEFAULT_LEASE_MS,
  } = {},
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError("limit must be an integer between 1 and 50");
  }

  if (!Number.isFinite(leaseMs) || leaseMs < 1000) {
    throw new RangeError("leaseMs must be at least 1000 milliseconds");
  }

  // Find plans represented in the first batch of eligible deliveries.
  // This query takes no row locks.
  const candidatePlans = await tx.$queryRaw`
    SELECT DISTINCT batch."planId"
    FROM (
      SELECT d."planId", d."scheduledAt", d."id"
      FROM "DistributionDelivery" AS d
      JOIN "DistributionPlan" AS p ON p."id" = d."planId"
      JOIN "Content" AS c ON c."id" = p."contentId"
      WHERE d."status" = 'QUEUED'
        AND d."scheduledAt" <= ${now}
        AND (
          d."nextAttemptAt" IS NULL
          OR d."nextAttemptAt" <= ${now}
        )
        AND p."status" IN ('QUEUED', 'ACTIVE')
        AND c."status" = 'APPROVED'
      ORDER BY d."scheduledAt" ASC, d."id" ASC
      LIMIT ${limit}
    ) AS batch
    ORDER BY batch."planId" ASC
  `;

  const planIds = [
    ...new Set(candidatePlans.map((candidate) => candidate.planId)),
  ].sort();

  if (planIds.length === 0) {
    return [];
  }

  for (const planId of planIds) {
    await tx.$queryRaw`
      WITH lock_result AS MATERIALIZED (
  SELECT pg_advisory_xact_lock(hashtextextended(${planId}, 0))
)
SELECT TRUE AS "locked"
FROM lock_result
    `;
  }

  // Restrict claims to plans whose advisory locks were acquired.
  const candidates = await tx.$queryRaw`
    SELECT d."id"
    FROM "DistributionDelivery" AS d
    JOIN "DistributionPlan" AS p ON p."id" = d."planId"
    JOIN "Content" AS c ON c."id" = p."contentId"
    WHERE p."id" = ANY(${planIds}::text[])
      AND d."status" = 'QUEUED'
      AND d."scheduledAt" <= ${now}
      AND (
        d."nextAttemptAt" IS NULL
        OR d."nextAttemptAt" <= ${now}
      )
      AND p."status" IN ('QUEUED', 'ACTIVE')
      AND c."status" = 'APPROVED'
    ORDER BY d."scheduledAt" ASC, d."id" ASC
    LIMIT ${limit}
    FOR UPDATE OF d, p, c SKIP LOCKED
  `;

  const claimed = [];
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  for (const candidate of candidates) {
    const claimToken = randomUUID();

    const result = await tx.distributionDelivery.updateMany({
      where: {
        id: candidate.id,
        status: "QUEUED",
      },
      data: {
        status: "PROCESSING",
        attemptCount: { increment: 1 },
        processingStartedAt: now,
        processingLeaseExpiresAt: leaseExpiresAt,
        claimToken,
      },
    });

    if (result.count === 1) {
      claimed.push({
        id: candidate.id,
        claimToken,
        processingStartedAt: now,
        processingLeaseExpiresAt: leaseExpiresAt,
      });
    }
  }

  return claimed;
}
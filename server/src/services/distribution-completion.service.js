/**
 * Mark a delivery published only if this worker still owns its claim.
 * Call inside a caller-owned Prisma transaction.
 * This function never performs an external publish or commits the transaction.
 */
export async function completeClaimedDelivery(
  tx,
  {
    deliveryId,
    claimToken,
    externalPostId = null,
    publishedAt = new Date(),
  } = {},
) {
  if (typeof deliveryId !== "string" || deliveryId.trim() === "") {
    throw new TypeError("deliveryId is required");
  }

  if (typeof claimToken !== "string" || claimToken.trim() === "") {
    throw new TypeError("claimToken is required");
  }

  if (
    externalPostId !== null &&
    typeof externalPostId !== "string"
  ) {
    throw new TypeError("externalPostId must be a string or null");
  }

  if (
    !(publishedAt instanceof Date) ||
    !Number.isFinite(publishedAt.getTime())
  ) {
    throw new TypeError("publishedAt must be a valid Date");
  }

  // Read the plan ID before acquiring the shared plan lock.
  const delivery = await tx.distributionDelivery.findUnique({
    where: { id: deliveryId },
    select: { planId: true },
  });

  if (!delivery) return false;

  // Use the same advisory lock as claiming and lease recovery.
  await tx.$queryRaw`
    WITH lock_result AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        hashtextextended(${delivery.planId}, 0)
      )
    )
    SELECT TRUE AS "locked"
    FROM lock_result
  `;

  // The exact token is the ownership check. If recovery or a new claim
  // has replaced it, the stale worker cannot complete this delivery.
  const result = await tx.distributionDelivery.updateMany({
    where: {
      id: deliveryId,
      status: "PROCESSING",
      claimToken,
    },
    data: {
      status: "PUBLISHED",
      externalPostId,
      publishedAt,
      lastError: null,
      nextAttemptAt: null,
      processingStartedAt: null,
      processingLeaseExpiresAt: null,
      claimToken: null,
    },
  });

  return result.count === 1;
}

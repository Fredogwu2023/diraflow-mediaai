ALTER TABLE "DistributionDelivery"
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "processingLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "claimToken" TEXT;

CREATE INDEX "DistributionDelivery_status_processingLeaseExpiresAt_idx"
  ON "DistributionDelivery"("status", "processingLeaseExpiresAt");

-- CreateEnum
CREATE TYPE "DistributionPlanStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "DistributionRepeatInterval" AS ENUM ('NONE', 'DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "DistributionDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DistributionPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "repeatInterval" "DistributionRepeatInterval" NOT NULL DEFAULT 'NONE',
    "repeatCount" INTEGER NOT NULL DEFAULT 1,
    "status" "DistributionPlanStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionDelivery" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "occurrenceNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "DistributionDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "externalPostId" TEXT,
    "lastError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributionPlan_organizationId_idx" ON "DistributionPlan"("organizationId");

-- CreateIndex
CREATE INDEX "DistributionPlan_workspaceId_idx" ON "DistributionPlan"("workspaceId");

-- CreateIndex
CREATE INDEX "DistributionPlan_contentId_idx" ON "DistributionPlan"("contentId");

-- CreateIndex
CREATE INDEX "DistributionPlan_createdById_idx" ON "DistributionPlan"("createdById");

-- CreateIndex
CREATE INDEX "DistributionPlan_status_idx" ON "DistributionPlan"("status");

-- CreateIndex
CREATE INDEX "DistributionPlan_scheduledAt_idx" ON "DistributionPlan"("scheduledAt");

-- CreateIndex
CREATE INDEX "DistributionDelivery_planId_idx" ON "DistributionDelivery"("planId");

-- CreateIndex
CREATE INDEX "DistributionDelivery_status_scheduledAt_idx" ON "DistributionDelivery"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "DistributionDelivery_nextAttemptAt_idx" ON "DistributionDelivery"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "DistributionDelivery_planId_platform_occurrenceNumber_key" ON "DistributionDelivery"("planId", "platform", "occurrenceNumber");

-- AddForeignKey
ALTER TABLE "DistributionPlan" ADD CONSTRAINT "DistributionPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionPlan" ADD CONSTRAINT "DistributionPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionPlan" ADD CONSTRAINT "DistributionPlan_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionPlan" ADD CONSTRAINT "DistributionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionDelivery" ADD CONSTRAINT "DistributionDelivery_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DistributionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

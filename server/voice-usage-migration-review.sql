-- CreateEnum
CREATE TYPE "VoiceUsageStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'BLOCKED');

-- CreateTable
CREATE TABLE "VoiceUsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "operation" TEXT NOT NULL DEFAULT 'voice_preview',
    "characterCount" INTEGER NOT NULL,
    "status" "VoiceUsageStatus" NOT NULL,
    "httpStatus" INTEGER,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceUsageEvent_organizationId_workspaceId_createdAt_idx" ON "VoiceUsageEvent"("organizationId", "workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceUsageEvent_userId_createdAt_idx" ON "VoiceUsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceUsageEvent_status_createdAt_idx" ON "VoiceUsageEvent"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceUsageEvent" ADD CONSTRAINT "VoiceUsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceUsageEvent" ADD CONSTRAINT "VoiceUsageEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceUsageEvent" ADD CONSTRAINT "VoiceUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

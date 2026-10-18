CREATE TYPE "UsageMediaType" AS ENUM ('VOICE', 'VIDEO');

ALTER TABLE "VoiceUsageEvent"
ADD COLUMN "mediaType" "UsageMediaType" NOT NULL DEFAULT 'VOICE';

CREATE INDEX "VoiceUsageEvent_mediaType_createdAt_idx"
ON "VoiceUsageEvent"("mediaType", "createdAt");
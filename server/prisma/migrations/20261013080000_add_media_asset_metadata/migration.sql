CREATE TYPE "MediaAssetStatus" AS ENUM (
  'PENDING_UPLOAD',
  'AVAILABLE',
  'FAILED',
  'DELETED'
);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "contentId" TEXT,
  "uploadedById" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "status" "MediaAssetStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAsset_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaAsset_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaAsset_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "Content"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MediaAsset_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MediaAsset_storageKey_key"
  ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_organizationId_workspaceId_idx"
  ON "MediaAsset"("organizationId", "workspaceId");
CREATE INDEX "MediaAsset_contentId_idx"
  ON "MediaAsset"("contentId");
CREATE INDEX "MediaAsset_uploadedById_idx"
  ON "MediaAsset"("uploadedById");
CREATE INDEX "MediaAsset_status_createdAt_idx"
  ON "MediaAsset"("status", "createdAt");
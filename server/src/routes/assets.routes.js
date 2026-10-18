import express from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import {
  createUploadUrl,
  createDownloadUrl,
  deleteStoredObject,
  verifyStoredObject,
} from "../services/storage.service.js";

const router = express.Router();

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LOCAL_STORAGE_ROOT = path.join(PROJECT_ROOT, "storage", "media-assets");
const isLocalStorage = () =>
  process.env.MEDIA_STORAGE_MODE?.trim().toLowerCase() === "local";

const MAX_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "text/plain",
]);

const localUploadParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return callback(new Error("This file type is not supported."));
    }
    callback(null, true);
  },
});

function localFilePath(assetId) {
  if (typeof assetId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(assetId)) {
    throw new Error("Invalid asset identifier.");
  }
  return path.join(LOCAL_STORAGE_ROOT, assetId);
}

async function getUserContext(userId) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: { isActive: true },
    },
    include: { organization: true },
  });

  if (!membership) {
    throw new Error("User does not belong to an active organization");
  }

  const workspaceMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspace: {
        organizationId: membership.organizationId,
        isActive: true,
      },
    },
    include: { workspace: true },
  });

  if (!workspaceMembership) {
    throw new Error("User does not belong to an active workspace");
  }

  return {
    organizationId: membership.organizationId,
    workspaceId: workspaceMembership.workspaceId,
  };
}

function publicAsset(asset) {
  return {
    id: asset.id,
    contentId: asset.contentId,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes.toString(),
    status: asset.status,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

function safeFilename(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\/\\]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 200);
}

function handleError(res, error, operation) {
  console.error(`Asset ${operation} failed:`, error);

  if (
    error.message?.includes("S3 storage is not configured") ||
    error.message?.includes("S3 configuration is incomplete")
  ) {
    return res.status(503).json({
      success: false,
      message: "File storage is not configured.",
    });
  }

  return res.status(500).json({
    success: false,
    message: `Asset ${operation} failed.`,
  });
}

router.post(
  "/upload-url",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    let asset;

    try {
      const context = await getUserContext(req.user.id);
      const originalFilename = safeFilename(req.body?.originalFilename);
      const { mimeType, sizeBytes, contentId } = req.body ?? {};
      const size = Number(sizeBytes);

      if (
        !originalFilename ||
        typeof mimeType !== "string" ||
        !ALLOWED_TYPES.has(mimeType) ||
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > MAX_SIZE_BYTES
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid filename, file type, or file size. Maximum size is 100 MB.",
        });
      }

      if (contentId !== undefined && contentId !== null) {
        if (typeof contentId !== "string" || !contentId.trim()) {
          return res.status(400).json({
            success: false,
            message: "Invalid contentId.",
          });
        }

        const content = await prisma.content.findFirst({
          where: {
            id: contentId,
            organizationId: context.organizationId,
            workspaceId: context.workspaceId,
          },
          select: { id: true },
        });

        if (!content) {
          return res.status(404).json({
            success: false,
            message: "Content was not found in this workspace.",
          });
        }
      }

      const storageKey =
        `org/${context.organizationId}/workspace/${context.workspaceId}/${randomUUID()}`;

      asset = await prisma.mediaAsset.create({
        data: {
          ...context,
          contentId: contentId || null,
          uploadedById: req.user.id,
          storageKey,
          originalFilename,
          mimeType,
          sizeBytes: BigInt(size),
          status: "PENDING_UPLOAD",
        },
      });

      if (isLocalStorage()) {
        return res.status(201).json({
          success: true,
          asset: publicAsset(asset),
          uploadMode: "local",
        });
      }

      const uploadUrl = await createUploadUrl({
        key: storageKey,
        contentType: mimeType,
        expiresInSeconds: 300,
      });

      return res.status(201).json({
        success: true,
        asset: publicAsset(asset),
        uploadUrl,
        uploadMode: "s3",
        expiresInSeconds: 300,
        requiredHeaders: { "Content-Type": mimeType },
      });
    } catch (error) {
      if (asset) {
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { status: "FAILED" },
        }).catch((updateError) => {
          console.error("Could not mark failed asset:", updateError);
        });
      }

      if (error.message?.includes("membership")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return handleError(res, error, "upload URL creation");
    }
  }
);

router.post(
  "/:id/local-upload",
  authenticateToken,
  requirePermission("content.create"),
  localUploadParser.single("file"),
  async (req, res) => {
    let targetPath;
    let fileWritten = false;

    try {
      if (!isLocalStorage()) {
        return res.status(404).json({
          success: false,
          message: "Local uploads are disabled.",
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Choose a supported file to upload.",
        });
      }

      const context = await getUserContext(req.user.id);
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: req.params.id,
          ...context,
          uploadedById: req.user.id,
          status: "PENDING_UPLOAD",
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Pending asset not found for this user and workspace.",
        });
      }

      if (
        safeFilename(file.originalname) !== asset.originalFilename ||
        file.mimetype !== asset.mimeType ||
        file.size !== Number(asset.sizeBytes) ||
        file.size < 1 ||
        file.size > MAX_SIZE_BYTES
      ) {
        return res.status(400).json({
          success: false,
          message: "Uploaded file metadata does not match the pending asset.",
        });
      }

      targetPath = localFilePath(asset.id);
      await fs.mkdir(LOCAL_STORAGE_ROOT, { recursive: true });
      await fs.writeFile(targetPath, file.buffer, { flag: "w" });
      fileWritten = true;

      const updated = await prisma.mediaAsset.updateMany({
        where: {
          id: asset.id,
          ...context,
          uploadedById: req.user.id,
          status: "PENDING_UPLOAD",
        },
        data: { status: "AVAILABLE" },
      });

      if (updated.count !== 1) {
        await fs.unlink(targetPath).catch(() => {});
        fileWritten = false;
        return res.status(409).json({
          success: false,
          message: "Asset state changed during upload. Refresh the library before retrying.",
        });
      }

      const available = await prisma.mediaAsset.findUnique({
        where: { id: asset.id },
      });

      return res.json({
        success: true,
        asset: publicAsset(available),
      });
    } catch (error) {
      if (fileWritten && targetPath) {
        await fs.unlink(targetPath).catch(() => {});
      }
      if (error.message?.includes("membership")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "The file exceeds the 100 MB limit.",
        });
      }
      if (error.message?.includes("supported file type")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      return handleError(res, error, "local upload");
    }
  }
);

router.post("/:id/complete",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: req.params.id,
          ...context,
          uploadedById: req.user.id,
          status: "PENDING_UPLOAD",
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Pending asset not found for this user and workspace.",
        });
      }

      await verifyStoredObject({
        key: asset.storageKey,
        expectedSize: asset.sizeBytes,
        expectedContentType: asset.mimeType,
      });

      const updated = await prisma.mediaAsset.updateMany({
        where: {
          id: asset.id,
          ...context,
          uploadedById: req.user.id,
          status: "PENDING_UPLOAD",
        },
        data: { status: "AVAILABLE" },
      });

      if (updated.count !== 1) {
        return res.status(409).json({
          success: false,
          message: "Asset state changed; completion must be retried after inspection.",
        });
      }

      const available = await prisma.mediaAsset.findUnique({
        where: { id: asset.id },
      });

      return res.json({ success: true, asset: publicAsset(available) });
    } catch (error) {
      if (
        error.message?.includes("membership")
      ) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return handleError(res, error, "upload verification");
    }
  }
);

router.get(
  "/",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);
      const assets = await prisma.mediaAsset.findMany({
        where: context,
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return res.json({
        success: true,
        assets: assets.map(publicAsset),
      });
    } catch (error) {
      if (error.message?.includes("membership")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return handleError(res, error, "listing");
    }
  }
);

router.get(
  "/:id/file",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      if (!isLocalStorage()) {
        return res.status(404).json({
          success: false,
          message: "Local file access is disabled.",
        });
      }

      const context = await getUserContext(req.user.id);
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: req.params.id,
          ...context,
          status: "AVAILABLE",
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Available asset not found in this workspace.",
        });
      }

      const buffer = await fs.readFile(localFilePath(asset.id));
      res.set({
        "Content-Type": asset.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      });
      return res.send(buffer);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          message: "The local file is missing from development storage.",
        });
      }
      if (error.message?.includes("membership")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }
      return handleError(res, error, "local file retrieval");
    }
  }
);

router.get("/:id/download-url",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: req.params.id,
          ...context,
          status: "AVAILABLE",
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Available asset not found in this workspace.",
        });
      }

      if (isLocalStorage()) {
        return res.json({
          success: true,
          localFile: true,
          fileUrl: `/api/assets/${encodeURIComponent(asset.id)}/file`,
        });
      }

      const downloadUrl = await createDownloadUrl({
        key: asset.storageKey,
        expiresInSeconds: 300,
      });

      return res.json({
        success: true,
        downloadUrl,
        localFile: false,
        expiresInSeconds: 300,
      });
    } catch (error) {
      if (error.message?.includes("membership")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return handleError(res, error, "download URL creation");
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: req.params.id,
          ...context,
          uploadedById: req.user.id,
          status: { in: ["PENDING_UPLOAD", "AVAILABLE", "FAILED"] },
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Deletable asset not found for this user and workspace.",
        });
      }

      if (asset.status === "AVAILABLE") {
        if (isLocalStorage()) {
          await fs.unlink(localFilePath(asset.id)).catch((error) => {
            if (error.code !== "ENOENT") throw error;
          });
        } else {
          await deleteStoredObject({ key: asset.storageKey });
        }
      }

      const updated = await prisma.mediaAsset.updateMany({
        where: {
          id: asset.id,
          ...context,
          uploadedById: req.user.id,
          status: asset.status,
        },
        data: { status: "DELETED" },
      });

      if (updated.count !== 1) {
        return res.status(409).json({
          success: false,
          message: "Asset state changed during deletion.",
        });
      }

      return res.json({ success: true, id: asset.id, status: "DELETED" });
    } catch (error) {
      if (error.message?.includes("membership")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return handleError(res, error, "deletion");
    }
  }
);

export default router;

import express from "express";

import { prisma } from "../lib/prisma.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

import {
  createContent,
  listContent,
  getContentById,
  updateContent,
  archiveContent,
} from "../services/content.service.js";

const router = express.Router();

const allowedTypes = [
  "TEXT",
  "SCRIPT",
  "VIDEO",
  "AUDIO",
  "IMAGE",
  "SOCIAL_POST",
];

const allowedStatuses = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

async function getUserContext(userId) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: {
        isActive: true,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    return null;
  }

  const workspaceMembership =
    await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspace: {
          organizationId: membership.organizationId,
          isActive: true,
        },
      },
      include: {
        workspace: true,
      },
    });

  if (!workspaceMembership) {
    return null;
  }

  return {
    organizationId: membership.organizationId,
    workspaceId: workspaceMembership.workspaceId,
  };
}

// POST /api/content
router.post(
  "/",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        body,
      } = req.body;

      if (!title || typeof title !== "string") {
        return res.status(400).json({
          success: false,
          message: "Content title is required.",
        });
      }

      if (!type || !allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Content type must be one of: ${allowedTypes.join(", ")}.`,
        });
      }

      const context = await getUserContext(req.user.id);

      if (!context) {
        return res.status(403).json({
          success: false,
          message:
            "User does not have an active organization and workspace.",
        });
      }

      const content = await createContent({
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        createdById: req.user.id,
        title: title.trim(),
        description:
          typeof description === "string"
            ? description.trim()
            : null,
        type,
        body:
          typeof body === "string"
            ? body
            : null,
      });

      return res.status(201).json({
        success: true,
        message: "Content created successfully.",
        content,
      });
    } catch (error) {
      console.error("Create content error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create content.",
      });
    }
  }
);

// GET /api/content
router.get(
  "/",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);

      if (!context) {
        return res.status(403).json({
          success: false,
          message:
            "User does not have an active organization and workspace.",
        });
      }

      const contents = await listContent(context);

      return res.json({
        success: true,
        count: contents.length,
        contents,
      });
    } catch (error) {
      console.error("List content error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve content.",
      });
    }
  }
);

// GET /api/content/:id
router.get(
  "/:id",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);

      if (!context) {
        return res.status(403).json({
          success: false,
          message:
            "User does not have an active organization and workspace.",
        });
      }

      const content = await getContentById({
        id: req.params.id,
        ...context,
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found.",
        });
      }

      return res.json({
        success: true,
        content,
      });
    } catch (error) {
      console.error("Get content error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve content.",
      });
    }
  }
);

// PUT /api/content/:id
router.put(
  "/:id",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        body,
        status,
      } = req.body;

      const context = await getUserContext(req.user.id);

      if (!context) {
        return res.status(403).json({
          success: false,
          message:
            "User does not have an active organization and workspace.",
        });
      }

      const data = {};

      if (title !== undefined) {
        if (
          typeof title !== "string" ||
          !title.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Title must be a non-empty text value.",
          });
        }

        data.title = title.trim();
      }

      if (description !== undefined) {
        data.description =
          typeof description === "string"
            ? description.trim()
            : null;
      }

      if (type !== undefined) {
        if (!allowedTypes.includes(type)) {
          return res.status(400).json({
            success: false,
            message: `Content type must be one of: ${allowedTypes.join(", ")}.`,
          });
        }

        data.type = type;
      }

      if (body !== undefined) {
        data.body =
          typeof body === "string"
            ? body
            : null;
      }

      if (status !== undefined) {
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Content status must be one of: ${allowedStatuses.join(", ")}.`,
          });
        }

        data.status = status;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid content fields were provided for update.",
        });
      }

      const content = await updateContent({
        id: req.params.id,
        ...context,
        data,
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found.",
        });
      }

      return res.json({
        success: true,
        message: "Content updated successfully.",
        content,
      });
    } catch (error) {
      console.error("Update content error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update content.",
      });
    }
  }
);

// DELETE /api/content/:id
router.delete(
  "/:id",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);

      if (!context) {
        return res.status(403).json({
          success: false,
          message:
            "User does not have an active organization and workspace.",
        });
      }

      const content = await archiveContent({
        id: req.params.id,
        ...context,
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found.",
        });
      }

      return res.json({
        success: true,
        message: "Content archived successfully.",
        content,
      });
    } catch (error) {
      console.error("Archive content error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to archive content.",
      });
    }
  }
);

export default router;

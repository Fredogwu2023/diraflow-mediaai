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
  submitContentForReview,
  reviewContent,
  approveContent,
  publishContent,
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

/*
|--------------------------------------------------------------------------
| USER CONTEXT
|--------------------------------------------------------------------------
*/

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
    throw new Error(
      "User does not belong to an active organization"
    );
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
    throw new Error(
      "User does not belong to an active workspace"
    );
  }

  return {
    organizationId: membership.organizationId,
    workspaceId: workspaceMembership.workspaceId,
  };
}

/*
|--------------------------------------------------------------------------
| GET SCOPED CONTENT
|--------------------------------------------------------------------------
*/

async function getScopedContent(req) {
  const context = await getUserContext(req.user.id);

  const content = await getContentById(
    context.organizationId,
    context.workspaceId,
    req.params.id
  );

  return {
    context,
    content,
  };
}

/*
|--------------------------------------------------------------------------
| CREATE CONTENT
|--------------------------------------------------------------------------
|
| POST /api/content
|
| Permission: content.create
|--------------------------------------------------------------------------
*/

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

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      if (!type || !allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid content type. Allowed types: ${allowedTypes.join(
            ", "
          )}`,
        });
      }

      const context = await getUserContext(
        req.user.id
      );

      const content = await createContent({
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        createdById: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        body: body || null,
      });

      return res.status(201).json({
        success: true,
        message: "Content created successfully",
        data: content,
      });
    } catch (error) {
      console.error(
        "Create content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to create content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LIST CONTENT
|--------------------------------------------------------------------------
|
| GET /api/content
|
| Permission: content.read
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const context = await getUserContext(
        req.user.id
      );

      const content = await listContent(
        context.organizationId,
        context.workspaceId
      );

      return res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error(
        "List content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to retrieve content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET CONTENT BY ID
|--------------------------------------------------------------------------
|
| GET /api/content/:id
|
| Permission: content.read
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const { content } =
        await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      return res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error(
        "Get content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to retrieve content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE CONTENT
|--------------------------------------------------------------------------
|
| PUT /api/content/:id
|
| Permission: content.create
|
| Only DRAFT content can be edited.
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const {
        context,
        content,
      } = await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      if (content.status !== "DRAFT") {
        return res.status(400).json({
          success: false,
          message:
            "Only draft content can be edited",
        });
      }

      const {
        title,
        description,
        type,
        body,
      } = req.body;

      if (
        type &&
        !allowedTypes.includes(type)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid content type",
        });
      }

      const updated =
        await updateContent(
          context.organizationId,
          context.workspaceId,
          req.params.id,
          {
            ...(title !== undefined && {
              title: title.trim(),
            }),
            ...(description !== undefined && {
              description:
                description?.trim() || null,
            }),
            ...(type !== undefined && {
              type,
            }),
            ...(body !== undefined && {
              body,
            }),
          },
          req.user.id
        );

      return res.json({
        success: true,
        message:
          "Content updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Update content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| SUBMIT CONTENT FOR REVIEW
|--------------------------------------------------------------------------
|
| POST /api/content/:id/submit-review
|
| Permission: content.create
|
| DRAFT → IN_REVIEW
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/submit-review",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const {
        context,
        content,
      } = await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      if (content.status !== "DRAFT") {
        return res.status(400).json({
          success: false,
          message:
            "Only draft content can be submitted for review",
        });
      }

      const updated =
        await submitContentForReview(
          context.organizationId,
          context.workspaceId,
          req.params.id,
          req.user.id
        );

      return res.json({
        success: true,
        message:
          "Content submitted for review",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Submit review error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to submit content for review",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| REVIEW CONTENT
|--------------------------------------------------------------------------
|
| POST /api/content/:id/review
|
| Permission: content.review
|
| Records reviewer and review timestamp.
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/review",
  authenticateToken,
  requirePermission("content.review"),
  async (req, res) => {
    try {
      const {
        context,
        content,
      } = await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      if (content.status !== "IN_REVIEW") {
        return res.status(400).json({
          success: false,
          message:
            "Only content in review can be reviewed",
        });
      }

      const updated =
        await reviewContent(
          context.organizationId,
          context.workspaceId,
          req.params.id,
          req.user.id
        );

      return res.json({
        success: true,
        message:
          "Content reviewed successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Review content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to review content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| APPROVE CONTENT
|--------------------------------------------------------------------------
|
| POST /api/content/:id/approve
|
| Permission: content.approve
|
| IN_REVIEW → APPROVED
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/approve",
  authenticateToken,
  requirePermission("content.approve"),
  async (req, res) => {
    try {
      const {
        context,
        content,
      } = await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      if (content.status !== "IN_REVIEW") {
        return res.status(400).json({
          success: false,
          message:
            "Only content in review can be approved",
        });
      }

      if (!content.reviewedById) {
        return res.status(400).json({
          success: false,
          message:
            "Content must be reviewed before approval",
        });
      }

      const updated =
        await approveContent(
          context.organizationId,
          context.workspaceId,
          req.params.id,
          req.user.id
        );

      return res.json({
        success: true,
        message:
          "Content approved successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Approve content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to approve content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PUBLISH CONTENT
|--------------------------------------------------------------------------
|
| POST /api/content/:id/publish
|
| Permission: content.publish
|
| APPROVED → PUBLISHED
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/publish",
  authenticateToken,
  requirePermission("content.publish"),
  async (req, res) => {
    try {
      const {
        context,
        content,
      } = await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      if (content.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          message:
            "Only approved content can be published",
        });
      }

      const updated =
        await publishContent(
          context.organizationId,
          context.workspaceId,
          req.params.id,
          req.user.id
        );

      return res.json({
        success: true,
        message:
          "Content published successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Publish content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to publish content",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ARCHIVE CONTENT
|--------------------------------------------------------------------------
|
| DELETE /api/content/:id
|
| Permission: content.create
|
| Published content cannot be archived here.
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticateToken,
  requirePermission("content.create"),
  async (req, res) => {
    try {
      const {
        context,
        content,
      } = await getScopedContent(req);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      if (content.status === "PUBLISHED") {
        return res.status(400).json({
          success: false,
          message:
            "Published content cannot be archived through this action",
        });
      }

      const archived =
        await archiveContent(
          context.organizationId,
          context.workspaceId,
          req.params.id,
          req.user.id
        );

      return res.json({
        success: true,
        message:
          "Content archived successfully",
        data: archived,
      });
    } catch (error) {
      console.error(
        "Archive content error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to archive content",
      });
    }
  }
);

export default router;
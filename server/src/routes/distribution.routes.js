import express from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import {
  listDistributionPlans,
  createDistributionPlan,
  cancelDistributionPlan,
} from "../services/distribution.service.js";

const router = express.Router();

async function getUserContext(userId) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: { isActive: true },
    },
  });

  if (!membership) {
    const error = new Error("No active organization membership found.");
    error.statusCode = 403;
    throw error;
  }

  const workspaceMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspace: {
        organizationId: membership.organizationId,
        isActive: true,
      },
    },
  });

  if (!workspaceMembership) {
    const error = new Error("No active workspace membership found.");
    error.statusCode = 403;
    throw error;
  }

  return {
    organizationId: membership.organizationId,
    workspaceId: workspaceMembership.workspaceId,
  };
}

function requestMetadata(req) {
  return {
    ipAddress: req.ip || null,
    userAgent: req.get("user-agent") || null,
  };
}

router.get(
  "/",
  authenticateToken,
  requirePermission("content.publish"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);
      const data = await listDistributionPlans(context);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("List distribution plans error:", error);

      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to list distribution plans.",
      });
    }
  }
);

router.post(
  "/",
  authenticateToken,
  requirePermission("content.publish"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);

      const plan = await createDistributionPlan({
        context,
        userId: req.user.id,
        contentId: req.body?.contentId,
        platforms: req.body?.platforms,
        scheduledAt: req.body?.scheduledAt,
        timezone: req.body?.timezone,
        repeatInterval: req.body?.repeatInterval,
        repeatCount: req.body?.repeatCount,
        ...requestMetadata(req),
      });

      return res.status(201).json({
        success: true,
        message:
          "Distribution plan queued. External publishing requires a configured platform integration.",
        data: plan,
      });
    } catch (error) {
      console.error("Create distribution plan error:", error);

      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || "Failed to create distribution plan.",
      });
    }
  }
);

router.post(
  "/:id/cancel",
  authenticateToken,
  requirePermission("content.publish"),
  async (req, res) => {
    try {
      const context = await getUserContext(req.user.id);

      const plan = await cancelDistributionPlan({
        context,
        userId: req.user.id,
        planId: req.params.id,
        ...requestMetadata(req),
      });

      return res.json({
        success: true,
        message: "Distribution plan cancelled.",
        data: plan,
      });
    } catch (error) {
      console.error("Cancel distribution plan error:", error);

      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || "Failed to cancel distribution plan.",
      });
    }
  }
);

export default router;
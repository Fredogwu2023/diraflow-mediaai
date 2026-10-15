import { prisma } from "../lib/prisma.js";

export async function createAuditLog({
  organizationId,
  workspaceId = null,
  userId = null,
  action,
  resource = null,
  resourceId = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  return prisma.auditLog.create({
    data: {
      organizationId,
      workspaceId,
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
      userAgent,
    },
  });
}
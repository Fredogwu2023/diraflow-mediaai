import { prisma } from "../lib/prisma.js";
import { createAuditLog } from "./audit.service.js";

async function writeContentAudit({
  organizationId,
  workspaceId,
  userId,
  action,
  contentId,
  metadata = null,
}) {
  try {
    await createAuditLog({
      organizationId,
      workspaceId,
      userId,
      action,
      resource: "Content",
      resourceId: contentId,
      metadata,
    });
  } catch (error) {
    // Audit logging should not prevent the underlying business
    // operation from succeeding.
    console.error(`Audit log failed for ${action}:`, error);
  }
}

/*
|--------------------------------------------------------------------------
| CREATE CONTENT
|--------------------------------------------------------------------------
*/

export async function createContent({
  organizationId,
  workspaceId,
  createdById,
  title,
  description,
  type,
  body,
}) {
  const content = await prisma.content.create({
    data: {
      organizationId,
      workspaceId,
      createdById,
      title,
      description,
      type,
      body,
      status: "DRAFT",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: createdById,
    action: "CONTENT_CREATED",
    contentId: content.id,
    metadata: {
      title: content.title,
      type: content.type,
      status: content.status,
    },
  });

  return content;
}

/*
|--------------------------------------------------------------------------
| LIST CONTENT
|--------------------------------------------------------------------------
*/

export async function listContent(
  organizationId,
  workspaceId
) {
  return prisma.content.findMany({
    where: {
      organizationId,
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| GET CONTENT BY ID
|--------------------------------------------------------------------------
*/

export async function getContentById(
  organizationId,
  workspaceId,
  contentId
) {
  return prisma.content.findFirst({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE CONTENT
|--------------------------------------------------------------------------
|
| Only DRAFT content can be edited.
|--------------------------------------------------------------------------
*/

export async function updateContent(
  organizationId,
  workspaceId,
  contentId,
  data,
  updatedById
) {
  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
      status: "DRAFT",
    },
    data,
  });

  if (result.count === 0) {
    throw new Error(
      "Content not found or is no longer editable"
    );
  }

  const content = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: updatedById,
    action: "CONTENT_UPDATED",
    contentId,
    metadata: {
      title: content.title,
      type: content.type,
      status: content.status,
    },
  });

  return content;
}

/*
|--------------------------------------------------------------------------
| SUBMIT FOR REVIEW
|--------------------------------------------------------------------------
|
| DRAFT → IN_REVIEW
|--------------------------------------------------------------------------
*/

export async function submitContentForReview(
  organizationId,
  workspaceId,
  contentId,
  submittedById
) {
  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
      status: "DRAFT",
    },
    data: {
      status: "IN_REVIEW",
    },
  });

  if (result.count === 0) {
    throw new Error(
      "Content not found or is not in draft status"
    );
  }

  const content = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: submittedById,
    action: "CONTENT_SUBMITTED",
    contentId,
    metadata: {
      fromStatus: "DRAFT",
      toStatus: "IN_REVIEW",
    },
  });

  return content;
}

/*
|--------------------------------------------------------------------------
| REVIEW CONTENT
|--------------------------------------------------------------------------
|
| Records reviewer and review timestamp.
|
| IN_REVIEW → IN_REVIEW
|--------------------------------------------------------------------------
*/

export async function reviewContent(
  organizationId,
  workspaceId,
  contentId,
  reviewerId
) {
  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
      status: "IN_REVIEW",
    },
    data: {
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error(
      "Content not found or is not currently in review"
    );
  }

  const content = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: reviewerId,
    action: "CONTENT_REVIEWED",
    contentId,
    metadata: {
      status: content.status,
      reviewedAt: content.reviewedAt,
    },
  });

  return content;
}

/*
|--------------------------------------------------------------------------
| APPROVE CONTENT
|--------------------------------------------------------------------------
|
| IN_REVIEW → APPROVED
|
| Approval requires a completed review.
|--------------------------------------------------------------------------
*/

export async function approveContent(
  organizationId,
  workspaceId,
  contentId,
  approverId
) {
  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
      status: "IN_REVIEW",
      reviewedById: {
        not: null,
      },
    },
    data: {
      status: "APPROVED",
      approvedById: approverId,
      approvedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error(
      "Content must be reviewed before it can be approved"
    );
  }

  const content = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: approverId,
    action: "CONTENT_APPROVED",
    contentId,
    metadata: {
      fromStatus: "IN_REVIEW",
      toStatus: "APPROVED",
    },
  });

  return content;
}

/*
|--------------------------------------------------------------------------
| PUBLISH CONTENT
|--------------------------------------------------------------------------
|
| APPROVED → PUBLISHED
|--------------------------------------------------------------------------
*/

export async function publishContent(
  organizationId,
  workspaceId,
  contentId,
  publishedById
) {
  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
      status: "APPROVED",
    },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error(
      "Only approved content can be published"
    );
  }

  const content = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: publishedById,
    action: "CONTENT_PUBLISHED",
    contentId,
    metadata: {
      fromStatus: "APPROVED",
      toStatus: "PUBLISHED",
      publishedAt: content.publishedAt,
    },
  });

  return content;
}

/*
|--------------------------------------------------------------------------
| ARCHIVE CONTENT
|--------------------------------------------------------------------------
|
| Published content cannot be archived through this endpoint.
|--------------------------------------------------------------------------
*/

export async function archiveContent(
  organizationId,
  workspaceId,
  contentId,
  archivedById
) {
  const existing = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  if (!existing) {
    throw new Error("Content not found");
  }

  if (existing.status === "PUBLISHED") {
    throw new Error(
      "Published content cannot be archived through this action"
    );
  }

  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      organizationId,
      workspaceId,
      status: {
        not: "PUBLISHED",
      },
    },
    data: {
      status: "ARCHIVED",
    },
  });

  if (result.count === 0) {
    throw new Error(
      "Content could not be archived"
    );
  }

  const content = await getContentById(
    organizationId,
    workspaceId,
    contentId
  );

  await writeContentAudit({
    organizationId,
    workspaceId,
    userId: archivedById,
    action: "CONTENT_ARCHIVED",
    contentId,
    metadata: {
      fromStatus: existing.status,
      toStatus: "ARCHIVED",
    },
  });

  return content;
}
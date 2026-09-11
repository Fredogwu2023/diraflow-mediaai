import { prisma } from "../lib/prisma.js";

export async function createContent({
  organizationId,
  workspaceId,
  createdById,
  title,
  description,
  type,
  body,
}) {
  return prisma.content.create({
    data: {
      organizationId,
      workspaceId,
      createdById,
      title,
      description,
      type,
      body,
    },
  });
}

export async function listContent({
  organizationId,
  workspaceId,
}) {
  return prisma.content.findMany({
    where: {
      organizationId,
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getContentById({
  id,
  organizationId,
  workspaceId,
}) {
  return prisma.content.findFirst({
    where: {
      id,
      organizationId,
      workspaceId,
    },
  });
}

export async function updateContent({
  id,
  organizationId,
  workspaceId,
  data,
}) {
  const existingContent = await getContentById({
    id,
    organizationId,
    workspaceId,
  });

  if (!existingContent) {
    return null;
  }

  return prisma.content.update({
    where: {
      id: existingContent.id,
    },
    data,
  });
}

export async function archiveContent({
  id,
  organizationId,
  workspaceId,
}) {
  const existingContent = await getContentById({
    id,
    organizationId,
    workspaceId,
  });

  if (!existingContent) {
    return null;
  }

  return prisma.content.update({
    where: {
      id: existingContent.id,
    },
    data: {
      status: "ARCHIVED",
    },
  });
}

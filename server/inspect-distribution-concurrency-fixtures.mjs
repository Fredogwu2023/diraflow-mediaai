import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const [organization, workspace, publisher] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: "cmtbmnka50000a0uh9kip5ksj" },
      select: { id: true, slug: true }
    }),
    prisma.workspace.findUnique({
      where: { id: "cmtbmq41b0000m0uha2q8uhcm" },
      select: { id: true, organizationId: true, name: true }
    }),
    prisma.user.findUnique({
      where: { email: "test.publisher@diraflow.local" },
      select: { id: true, email: true, isActive: true }
    })
  ]);

  const result = {
    organization,
    workspace,
    publisher,
    checks: {
      organizationExists: Boolean(organization),
      workspaceExists: Boolean(workspace),
      publisherExists: Boolean(publisher),
      workspaceMatchesOrganization:
        Boolean(organization && workspace &&
          workspace.organizationId === organization.id),
      publisherActive: publisher?.isActive === true
    }
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    !result.checks.organizationExists ||
    !result.checks.workspaceExists ||
    !result.checks.publisherExists ||
    !result.checks.workspaceMatchesOrganization ||
    !result.checks.publisherActive
  ) {
    throw new Error("Fixture verification failed; do not run concurrency tests.");
  }
} finally {
  await prisma.$disconnect();
}

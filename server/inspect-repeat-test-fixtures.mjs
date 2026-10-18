import "dotenv/config";

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

// Import Prisma only after switching this process to the test database.
const { prisma } = await import("./src/lib/prisma.js");

try {
  const rows = await prisma.$queryRaw`
    SELECT current_database() AS database
  `;

  const database = rows[0]?.database;
  if (database !== "diraflow_mediaai_concurrency_test") {
    throw new Error(`Safety stop: connected to ${database}. No fixtures queried.`);
  }

  const [organizations, workspaces, users, approvedContent] = await Promise.all([
    prisma.organization.findMany({
      select: { id: true, name: true, isActive: true },
      take: 10
    }),
    prisma.workspace.findMany({
      select: { id: true, name: true, organizationId: true, isActive: true },
      take: 10
    }),
    prisma.user.findMany({
      select: { id: true, email: true },
      take: 10
    }),
    prisma.content.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        title: true,
        organizationId: true,
        workspaceId: true,
        status: true
      },
      take: 10
    })
  ]);

  console.log(JSON.stringify({
    database,
    organizations,
    workspaces,
    users,
    approvedContent
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

import "dotenv/config";

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");

const organizationId = "cmv6aigoj0000jsuheuol0szu";
const userId = "cmv6aigts0006jsuhvqe5jftm";

try {
  const rows = await prisma.$queryRaw`
    SELECT current_database() AS "db_name"
  `;
  const databaseName = rows?.[0]?.db_name;

  if (databaseName !== "diraflow_mediaai_concurrency_test") {
    throw new Error(`Safety stop: unexpected database ${databaseName}`);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true }
  });

  if (!organization) {
    console.log("Test organisation already removed; nothing to clean.");
  } else {
    await prisma.organization.delete({
      where: { id: organizationId }
    });
    console.log("Test organisation deleted; database cascades applied.");
  }

  const remainingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (remainingUser) {
    await prisma.user.delete({ where: { id: userId } });
    console.log("Test user deleted.");
  }

  const remainingOrganization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (remainingOrganization) {
    throw new Error("Cleanup verification failed: test organisation remains.");
  }

  console.log("PASS: test organisation cleanup verified.");
} finally {
  await prisma.$disconnect();
}

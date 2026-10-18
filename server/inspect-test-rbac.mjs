import "dotenv/config";

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");

try {
  const [{ database }, roleCount, permissionCount, mappingCount] =
    await Promise.all([
      prisma.$queryRaw`SELECT current_database() AS database`,
      prisma.role.count(),
      prisma.permission.count(),
      prisma.rolePermission.count()
    ]);

  if (database !== "diraflow_mediaai_concurrency_test") {
    throw new Error(`Safety stop: connected to ${database}`);
  }

  console.log(JSON.stringify({
    database,
    roleCount,
    permissionCount,
    rolePermissionMappingCount: mappingCount
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

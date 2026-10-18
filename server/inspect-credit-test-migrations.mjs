import "dotenv/config";

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");

try {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = '_prisma_migrations'
  `;

  if (tables.length === 0) {
    console.log("Migration history table: NOT FOUND");
  } else {
    const rows = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY started_at
    `;

    console.log("Migration history:");
    console.log(JSON.stringify(rows, null, 2));
  }
} finally {
  await prisma.$disconnect();
}

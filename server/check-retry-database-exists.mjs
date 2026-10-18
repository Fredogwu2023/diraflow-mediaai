import "dotenv/config";

const original = process.env.DATABASE_URL;
if (!original) throw new Error("DATABASE_URL is missing.");

const url = new URL(original);
url.pathname = "/postgres";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");

try {
  const rows = await prisma.$queryRaw`
    SELECT datname
    FROM pg_database
    WHERE datname IN (
      'diraflow_mediaai',
      'diraflow_mediaai_concurrency_test'
    )
    ORDER BY datname
  `;

  console.log(JSON.stringify({
    databases: rows.map(row => row.datname),
    testDatabaseExists: rows.some(
      row => row.datname === "diraflow_mediaai_concurrency_test"
    )
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

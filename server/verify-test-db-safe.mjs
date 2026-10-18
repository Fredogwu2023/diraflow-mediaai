import "dotenv/config";

const original = process.env.DATABASE_URL;
if (!original) throw new Error("DATABASE_URL is missing.");

const url = new URL(original);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");

try {
  const rows = await prisma.$queryRaw`
    SELECT current_database() AS database,
           current_setting('server_version') AS postgres_version
  `;

  console.log(JSON.stringify(rows, null, 2));

  if (rows[0]?.database !== "diraflow_mediaai_concurrency_test") {
    throw new Error("Safety check failed: wrong database.");
  }

  console.log("PASS: connected to the dedicated test database.");
} finally {
  await prisma.$disconnect();
}

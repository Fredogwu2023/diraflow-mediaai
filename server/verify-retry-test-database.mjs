import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const rows = await prisma.$queryRaw`
    SELECT current_database() AS database,
           current_setting('server_version') AS postgres_version
  `;
  console.log(JSON.stringify(rows, null, 2));

  if (rows[0]?.database !== "diraflow_mediaai_concurrency_test") {
    throw new Error(
      "Wrong database. Expected diraflow_mediaai_concurrency_test; no test writes performed."
    );
  }

  console.log("PASS: dedicated concurrency test database confirmed.");
} finally {
  await prisma.$disconnect();
}

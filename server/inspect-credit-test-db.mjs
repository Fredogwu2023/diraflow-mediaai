import "dotenv/config";

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");

try {
  const rows = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'Organization',
        'CreditAccount',
        'CreditTransaction',
        'VoiceUsageEvent'
      )
    ORDER BY table_name
  `;

  console.log("Credit test database table check:");
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await prisma.$disconnect();
}

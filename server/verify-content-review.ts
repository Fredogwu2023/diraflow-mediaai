import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const content = await prisma.content.findUnique({
  where: { id: "cmutyckc00000m8uhmwpjz6ch" },
  select: {
    id: true,
    title: true,
    status: true,
    reviewedById: true,
    reviewedAt: true,
    approvedById: true,
    approvedAt: true,
    publishedAt: true
  }
});

console.log(JSON.stringify(content, null, 2));

await prisma.$disconnect();

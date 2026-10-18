import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  const delivery = await prisma.distributionDelivery.findUnique({
    where: { id: "cmv5o1495000ao0uh5onx6ywq" },
    select: {
      id: true,
      platform: true,
      status: true,
      attemptCount: true,
      externalPostId: true,
      lastError: true,
      publishedAt: true,
      nextAttemptAt: true,
      plan: {
        select: {
          id: true,
          status: true,
          content: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  console.log(JSON.stringify(delivery, null, 2));
} finally {
  await prisma.$disconnect();
}

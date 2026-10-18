import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

try {
  console.log("Checking RBAC permissions query...");

  const result = await prisma.userRole.findMany({
    take: 1,
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  console.log("RBAC query succeeded.");
  console.log("User-role records checked:", result.length);

  if (result.length > 0) {
    console.log(
      "Permission records:",
      result.reduce(
        (count, item) => count + item.role.permissions.length,
        0
      )
    );
  }
} catch (error) {
  console.error("RBAC QUERY FAILED:");
  console.error(error.message);
} finally {
  await prisma.$disconnect();
}

import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const role = await prisma.role.findUnique({
  where: { name: "Social Media Manager" },
  include: {
    permissions: {
      include: {
        permission: true
      }
    }
  }
});

console.log(JSON.stringify({
  id: role?.id,
  name: role?.name,
  permissions: role?.permissions?.map((rp) => rp.permission.name)
}, null, 2));

await prisma.$disconnect();

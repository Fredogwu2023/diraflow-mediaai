import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const { prisma } = await import("./src/lib/prisma.js");

const users = [
  "test.creator@diraflow.local",
  "test.reviewer@diraflow.local",
  "test.approver@diraflow.local",
  "test.publisher@diraflow.local",
];

for (const email of users) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
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
      },
    },
  });

  const permissions = [
    ...new Set(
      (user?.userRoles ?? []).flatMap((userRole) =>
        userRole.role.permissions.map(
          (rolePermission) =>
            rolePermission.permission.name
        )
      )
    ),
  ];

  console.log(
    JSON.stringify(
      {
        email,
        permissions,
      },
      null,
      2
    )
  );
}

await prisma.$disconnect();

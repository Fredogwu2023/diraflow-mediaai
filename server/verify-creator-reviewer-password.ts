import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import bcrypt from "bcrypt";
const { prisma } = await import("./src/lib/prisma.js");

const tests = [
  { email: "test.creator@diraflow.local", password: "Creator123!" },
  { email: "test.reviewer@diraflow.local", password: "Reviewer123!" }
];

for (const test of tests) {
  const user = await prisma.user.findUnique({
    where: { email: test.email },
    select: { email: true, passwordHash: true }
  });

  const passwordMatches = user ? await bcrypt.compare(test.password, user.passwordHash) : false;

  console.log(JSON.stringify({
    email: test.email,
    userExists: Boolean(user),
    passwordMatches: passwordMatches
  }, null, 2));
}

await prisma.$disconnect();

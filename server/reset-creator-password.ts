import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import bcrypt from "bcrypt";
const { prisma } = await import("./src/lib/prisma.js");

const email = "test.creator@diraflow.local";
const newPassword = "Creator123!";

const passwordHash = await bcrypt.hash(newPassword, 12);

const user = await prisma.user.update({
  where: { email },
  data: { passwordHash }
});

console.log(JSON.stringify({
  email: user.email,
  passwordReset: true
}, null, 2));

await prisma.$disconnect();

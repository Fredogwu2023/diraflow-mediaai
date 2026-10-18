import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const email = "test.creator@diraflow.local";
const newPassword = "DiraFlowTest123!";

try {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log("Password reset successfully.");
  console.log(user);
  console.log(`Email: ${email}`);
  console.log(`New password: ${newPassword}`);
} catch (error) {
  console.error("Password reset failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

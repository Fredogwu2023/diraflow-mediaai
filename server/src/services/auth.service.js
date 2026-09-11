import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured in the environment.");
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
}
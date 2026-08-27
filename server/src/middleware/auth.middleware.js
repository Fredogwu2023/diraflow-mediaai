import "dotenv/config";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured in the environment.");
}

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required."
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive."
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

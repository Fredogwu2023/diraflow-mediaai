import express from "express";
import { prisma } from "../lib/prisma.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import {
  hashPassword,
  verifyPassword,
  generateToken
} from "../services/auth.service.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists."
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash
      }
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during registration."
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This user account is inactive."
      });
    }

    const passwordValid = await verifyPassword(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        lastLoginAt: new Date()
      }
    });

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during login."
    });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

router.get(
  "/permission-test",
  authenticateToken,
  requirePermission("organization.read"),
  async (req, res) => {
    return res.json({
      success: true,
      message: "Permission check passed.",
      user: req.user,
      role: req.role.name,
      permission: req.permission
    });
  }
);
export default router;

import "dotenv/config";
import express from "express";
import cors from "cors";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

import authRoutes from "./routes/auth.routes.js";
import contentRoutes from "./routes/content.routes.js";

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

// Make Prisma available to routes through Express
app.locals.prisma = prisma;

// Global middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "DiraFlow MediaAI API",
    version: "1.0.0",
    status: "running",
  });
});

// Health + database test
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "DiraFlow MediaAI API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "API is running but database connection failed",
      database: "disconnected",
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Content routes
app.use("/api/content", contentRoutes);

// Start server
app.listen(PORT, () => {
  console.log(
    `DiraFlow MediaAI API running on http://localhost:${PORT}`
  );
});

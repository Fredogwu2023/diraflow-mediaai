import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication routes
app.use("/api/auth", authRoutes);

// Basic API test
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");

    res.json({
      success: true,
      message: "DiraFlow MediaAI API is running",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "API is running but database connection failed",
      database: "disconnected"
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "DiraFlow MediaAI API",
    version: "1.0.0",
    status: "running"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`DiraFlow MediaAI API running on http://localhost:${PORT}`);
});

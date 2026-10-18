import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import contentRoutes from "./routes/content.routes.js";
import assetsRoutes from "./routes/assets.routes.js";
import distributionRoutes from "./routes/distribution.routes.js";
import voiceRoutes from "./routes/voice.routes.js";
import receptionistRoutes from "./routes/receptionist.routes.js";
import scriptUploadRoutes from "./routes/script-upload.routes.js";



const app = express();
const PORT = process.env.PORT || 5000;

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
app.use("/api/assets", assetsRoutes);
app.use("/api/distribution", distributionRoutes);

// Voice preview routes
app.use("/api/voices", voiceRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/scripts", scriptUploadRoutes);

// Start server
app.listen(PORT, () => {
  console.log(
    `DiraFlow MediaAI API running on http://localhost:${PORT}`
  );
});

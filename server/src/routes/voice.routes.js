import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

const MAX_PREVIEW_CHARACTERS = 1200;
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
async function recordVoiceUsageEvent({
  userId,
  status,
  mediaType = "VOICE",
  characterCount = 0,
  httpStatus = null,
  errorCode = null,
}) {
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organization: { isActive: true },
      },
      select: {
        organizationId: true,
      },
    });

    if (!membership) {
      console.error("Voice usage event skipped: no active organization.");
      return;
    }

    const workspaceMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspace: {
          organizationId: membership.organizationId,
          isActive: true,
        },
      },
      select: {
        workspaceId: true,
      },
    });

    if (!workspaceMembership) {
      console.error("Voice usage event skipped: no active workspace.");
      return;
    }

    await prisma.voiceUsageEvent.create({
      data: {
        organizationId: membership.organizationId,
        workspaceId: workspaceMembership.workspaceId,
        userId,
        mediaType,
        provider: "elevenlabs",
        operation: "voice_preview",
        characterCount,
        status,
        httpStatus,
        errorCode,
      },
    });
  } catch {
    // Usage logging must never interrupt the voice-preview response.
    console.error("Voice usage event could not be recorded.");
  }
}

/*
|--------------------------------------------------------------------------
| VOICE PREVIEW
|--------------------------------------------------------------------------
|
| POST /api/voices/preview
|
| Permission: content.read
|
| MVP protection:
| - Maximum 1-minute preview target
| - Maximum 1,200 characters
| - Provider key remains server-side
|--------------------------------------------------------------------------
*/

router.get(
  "/credits",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: req.user.id,
          organization: { isActive: true },
        },
        select: { organizationId: true },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "No active organization membership was found.",
        });
      }

      const organizationId = membership.organizationId;

      const account = await prisma.creditAccount.findUnique({
        where: { organizationId },
        select: {
          balance: true,
          lifetimeCredited: true,
          lifetimeDebited: true,
          status: true,
          updatedAt: true,
        },
      });

      const transactions = account
        ? await prisma.creditTransaction.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              type: true,
              amount: true,
              balanceAfter: true,
              referenceType: true,
              referenceId: true,
              description: true,
              createdAt: true,
            },
          })
        : [];

      return res.json({
        success: true,
        scope: "active_organization",
        credits: {
          balance: account?.balance ?? 0,
          lifetimeCredited: account?.lifetimeCredited ?? 0,
          lifetimeDebited: account?.lifetimeDebited ?? 0,
          status: account?.status ?? "NOT_INITIALIZED",
          updatedAt: account?.updatedAt ?? null,
        },
        transactions,
      });
    } catch (error) {
      console.error("Credit summary query failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to retrieve credit information.",
      });
    }
  }
);
router.get(
  "/usage",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: req.user.id,
          organization: { isActive: true },
        },
        select: {
          organizationId: true,
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "No active organization membership was found.",
        });
      }

      const workspaceMembership = await prisma.workspaceMember.findFirst({
        where: {
          userId: req.user.id,
          workspace: {
            organizationId: membership.organizationId,
            isActive: true,
          },
        },
        select: {
          workspaceId: true,
        },
      });

      if (!workspaceMembership) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership was found.",
        });
      }

      const scope = {
        organizationId: membership.organizationId,
        workspaceId: workspaceMembership.workspaceId,
      };
      const voiceScope = { ...scope, mediaType: "VOICE" };

      const [total, succeeded, failed, blocked, recentEvents] =
        await Promise.all([
          prisma.voiceUsageEvent.count({ where: voiceScope }),
          prisma.voiceUsageEvent.count({
            where: { ...voiceScope, status: "SUCCEEDED" },
          }),
          prisma.voiceUsageEvent.count({
            where: { ...voiceScope, status: "FAILED" },
          }),
          prisma.voiceUsageEvent.count({
            where: { ...voiceScope, status: "BLOCKED" },
          }),
          prisma.voiceUsageEvent.findMany({
            where: voiceScope,
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              operation: true,
              mediaType: true,
              characterCount: true,
              status: true,
              httpStatus: true,
              errorCode: true,
              createdAt: true,
            },
          }),
        ]);

      return res.json({
        success: true,
        scope: "active_workspace",
        provider: "elevenlabs",
        mediaType: "VOICE",
        usage: { total, succeeded, failed, blocked },
        subscriptionAllowance: {
          status: "NOT_CONNECTED",
          message: "Subscriber allowance is not connected yet.",
        },
        recentEvents,
      });
    } catch (error) {
      console.error("Voice usage query failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to retrieve voice usage.",
      });
    }
  }
);
router.get(
  "/available",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          success: false,
          message: "Voice preview service is not configured yet.",
        });
      }

      const response = await fetch(
        "https://api.elevenlabs.io/v1/voices",
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(
          "ElevenLabs voice-list request failed:",
          response.status
        );

        return res.status(502).json({
          success: false,
          message: "Unable to retrieve available voices.",
          providerStatus: response.status,
        });
      }

      const data = await response.json();
      const voices = Array.isArray(data.voices)
        ? data.voices
        : [];

      return res.json({
        success: true,
        voices: voices.map((voice) => ({
          voiceId: voice.voice_id,
          name: voice.name,
          category: voice.category || "",
          labels: voice.labels || {},
          description: voice.description || "",
        })),
      });
    } catch (error) {
      console.error(
        "Available voices request failed:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve available voices.",
      });
    }
  }
);
router.post(
  "/preview",
  authenticateToken,
  requirePermission("content.read"),
  async (req, res) => {
    let attemptedCharacterCount = 0;
    try {
      const apiKey =
        process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        await recordVoiceUsageEvent({
          userId: req.user.id,
          status: "BLOCKED",
          characterCount: 0,
          httpStatus: 503,
          errorCode: "provider_not_configured",
        });

        return res.status(503).json({
          success: false,
          message:
            "Voice preview service is not configured yet.",
        });
      }

      const {
        text,
        voiceId,
        modelId,
        speed,
      } = req.body || {};

      if (
        !text ||
        typeof text !== "string" ||
        !text.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Preview text is required.",
        });
      }

      const previewText = text.trim();

      if (
        previewText.length >
        MAX_PREVIEW_CHARACTERS
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Voice preview is limited to approximately 1 minute.",
          maxCharacters:
            MAX_PREVIEW_CHARACTERS,
        });
      }

      const selectedVoiceId =
        typeof voiceId === "string" &&
        voiceId.trim()
          ? voiceId.trim()
          : DEFAULT_VOICE_ID;

      const selectedModelId =
        typeof modelId === "string" &&
        modelId.trim()
          ? modelId.trim()
          : DEFAULT_MODEL_ID;

      const selectedSpeed =
        speed === undefined ? 1.0 : Number(speed);

      if (
        !Number.isFinite(selectedSpeed) ||
        selectedSpeed < 0.7 ||
        selectedSpeed > 1.2
      ) {
        return res.status(400).json({
          success: false,
          message: "Speed must be between 0.7 and 1.2.",
        });
      }

      attemptedCharacterCount = previewText.length;

      const elevenLabsResponse =
        await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
            selectedVoiceId
          )}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type":
                "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: previewText,
              model_id: selectedModelId,
              voice_settings: {
                speed: selectedSpeed,
              },
            }),
          }
        );

      if (!elevenLabsResponse.ok) {
        const errorText =
          await elevenLabsResponse.text();

        let providerError = {};

        try {
          providerError = JSON.parse(errorText);
        } catch {
          // Provider error details were not valid JSON.
        }

        const providerDetail = providerError?.detail || {};
        const providerCode = String(
          providerDetail.code || providerDetail.type || ""
        ).toLowerCase();
        const providerMessage = String(
          providerDetail.message || ""
        ).toLowerCase();

        const quotaExceeded =
          providerCode.includes("quota_exceeded") ||
          providerCode.includes("insufficient_credits") ||
          providerMessage.includes("quota") ||
          providerMessage.includes("credits remaining");

        await recordVoiceUsageEvent({
          userId: req.user.id,
          status: quotaExceeded ? "BLOCKED" : "FAILED",
          characterCount: previewText.length,
          httpStatus: elevenLabsResponse.status,
          errorCode: quotaExceeded
            ? "quota_exceeded"
            : elevenLabsResponse.status === 429
              ? "rate_limited"
              : "provider_error",
        });

        const userMessage = quotaExceeded
          ? "Voice previews are temporarily unavailable because the ElevenLabs preview allowance has been exhausted. You can continue using DiraFlow; previews can resume when the provider allowance is restored."
          : elevenLabsResponse.status === 429
            ? "Voice preview is temporarily rate-limited. Please wait a little before trying again."
            : "Voice preview generation failed. Please try again later.";

        return res.status(502).json({
          success: false,
          message: userMessage,
          providerStatus: elevenLabsResponse.status,
        });
      }

      const audioBuffer =
        Buffer.from(
          await elevenLabsResponse.arrayBuffer()
        );

      await recordVoiceUsageEvent({
        userId: req.user.id,
        status: "SUCCEEDED",
        characterCount: previewText.length,
        httpStatus: 200,
        errorCode: null,
      });

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
        "Cache-Control": "no-store",
      });

      return res.send(audioBuffer);
    } catch {
      if (attemptedCharacterCount > 0) {
        await recordVoiceUsageEvent({
          userId: req.user.id,
          status: "FAILED",
          characterCount: attemptedCharacterCount,
          httpStatus: 500,
          errorCode: "request_error",
        });
      }

      console.error("Voice preview request failed.");

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate voice preview.",
      });
    }
  }
);

export default router;

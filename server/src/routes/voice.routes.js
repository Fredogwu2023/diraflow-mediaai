import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = express.Router();

const MAX_PREVIEW_CHARACTERS = 1200;
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

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
    try {
      const apiKey =
        process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
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

        console.error(
          "ElevenLabs TTS error:",
          elevenLabsResponse.status,
          errorText
        );

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

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
        "Cache-Control": "no-store",
      });

      return res.send(audioBuffer);
    } catch (error) {
      console.error(
        "Voice preview error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate voice preview.",
      });
    }
  }
);

export default router;

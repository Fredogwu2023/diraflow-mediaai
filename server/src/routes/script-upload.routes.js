import express from "express";
import multer from "multer";
import mammoth from "mammoth";

import { basename, extname } from "node:path";
import { createRequire } from "node:module";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const router = express.Router();

const MAX_SCRIPT_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".docx", ".pdf", ".txt"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SCRIPT_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (req, file, callback) => {
    const extension = extname(file.originalname || "").toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return callback(
        new Error("Unsupported script format. Upload a .docx, .pdf, or .txt file.")
      );
    }

    callback(null, true);
  },
});

function receiveScriptDocument(req, res, next) {
  upload.single("document")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";

      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge
          ? "This script document exceeds the 50 MB upload limit."
          : "The upload could not be processed. Please check the file and try again.",
      });
    }

    return res.status(415).json({
      success: false,
      message: error.message || "Unsupported script document.",
    });
  });
}

router.post(
  "/extract-script",
  authenticateToken,
  requirePermission("content.create"),
  receiveScriptDocument,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Choose a Word, PDF, or plain-text script document first.",
        });
      }

      const extension = extname(req.file.originalname || "").toLowerCase();
      let extractedText = "";

      if (extension === ".txt") {
        if (req.file.buffer.includes(0)) {
          return res.status(422).json({
            success: false,
            message: "This does not appear to be a readable plain-text file.",
          });
        }

        extractedText = req.file.buffer.toString("utf8");
      } else if (extension === ".pdf") {
        if (!req.file.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
          return res.status(422).json({
            success: false,
            message: "The file does not appear to be a valid PDF document.",
          });
        }

        const parsed = await pdfParse(req.file.buffer);
        extractedText = parsed.text || "";
      } else if (extension === ".docx") {
        if (req.file.buffer.subarray(0, 2).toString() !== "PK") {
          return res.status(422).json({
            success: false,
            message: "The file does not appear to be a valid Word document.",
          });
        }

        const parsed = await mammoth.extractRawText({
          buffer: req.file.buffer,
        });

        extractedText = parsed.value || "";
      }

      extractedText = extractedText
        .replace(/\r\n?/g, "\n")
        .replace(/\u0000/g, "")
        .trim();

      if (!extractedText) {
        return res.status(422).json({
          success: false,
          message:
            extension === ".pdf"
              ? "No selectable text was found. This may be a scanned PDF; OCR is not enabled yet."
              : "No readable script text was found in this document.",
        });
      }

      const safeName = basename(req.file.originalname)
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .slice(0, 200);

      res.json({
        success: true,
        fileName: safeName,
        format: extension.slice(1).toUpperCase(),
        text: extractedText,
        characterCount: extractedText.length,
        wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      });
    } catch (error) {
      console.error("Script document extraction failed:", error.message);

      res.status(422).json({
        success: false,
        message:
          "The document could not be read. Check that it is a valid, unencrypted file and try again.",
      });
    }
  }
);

export default router;

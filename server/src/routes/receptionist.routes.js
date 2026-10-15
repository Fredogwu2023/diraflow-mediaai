import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = express.Router();
const MAX_MESSAGE_LENGTH = 1000;

function getTimeAwareGreeting(configuredGreeting) {
  const hour = new Date().getHours();
  const period =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
        ? "afternoon"
        : "evening";

  if (
    typeof configuredGreeting !== "string" ||
    !configuredGreeting.trim()
  ) {
    return `Good ${period}. How may I help you today?`;
  }

  return configuredGreeting.trim().slice(0, 500).replace(
    /^good\s+(morning|afternoon|evening)\b/i,
    `Good ${period}`
  );
}

router.post(
  "/simulate",
  authenticateToken,
  requirePermission("content.read"),
  (req, res) => {
    try {
      const { message, config = {} } = req.body || {};

      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Enter a caller message to continue.",
        });
      }

      const callerMessage = message.trim();

      if (callerMessage.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
          maxCharacters: MAX_MESSAGE_LENGTH,
        });
      }

      const businessName =
        typeof config.businessName === "string" &&
        config.businessName.trim()
          ? config.businessName.trim().slice(0, 120)
          : "our business";

      const greeting = getTimeAwareGreeting(config.greeting);

      const routeTo =
        typeof config.routeTo === "string" && config.routeTo.trim()
          ? config.routeTo.trim().slice(0, 100)
          : "the appropriate team";

      const instructions =
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 4000)
          : "";

      const captureContact = config.captureContact !== false;
      const escalateUrgent = config.escalateUrgent !== false;
      const text = callerMessage.toLowerCase();

      const urgentPattern =
        /\b(urgent|emergency|immediately|asap|danger|threat|fraud|security breach|serious complaint|legal action)\b/i;

      const asksForHuman =
        /\b(speak to|talk to|connect me|human|real person|manager|staff member)\b/i;

      const asksForPrice =
        /\b(price|pricing|cost|how much|quote|quotation|fee|fees)\b/i;

      const asksForProducts =
        /\b(product|service|services|what do you offer|what do you do|tell me about)\b/i;

      const asksForContact =
        /\b(contact|email address|phone number|call back|callback|reach you)\b/i;

      const asksToLeaveMessage =
        /\b(leave a message|take a message|pass a message|send a message)\b/i;

      let reply;
      let escalation = false;
      let category = "general";

      if (urgentPattern.test(text)) {
        category = "urgent";

        if (escalateUrgent) {
          escalation = true;
          reply =
            `I'm sorry this requires urgent attention. ` +
            `I'll flag this enquiry for a human team member in ${routeTo}. ` +
            `This is a simulation only; no person has been contacted or alerted.`;
        } else {
          reply =
            "I understand this may be urgent. Urgent escalation is disabled in the current settings. " +
            "Please contact the appropriate human support or emergency service directly if anyone is at risk.";
        }
      } else if (asksForHuman.test(text)) {
        category = "human_request";
        escalation = true;
        reply =
          `I can record that you would like to speak with a person from ${routeTo}. ` +
          "This simulation cannot transfer a call or confirm that anyone has been notified.";
      } else if (asksForPrice.test(text)) {
        category = "pricing";
        reply =
          `Thank you for asking about ${businessName}'s pricing. ` +
          "I don't have verified pricing information in this simulator, so I won't guess. " +
          `I can flag your enquiry for ${routeTo} to follow up.`;
      } else if (asksForProducts.test(text)) {
        category = "products_services";
        reply =
          `Thank you for your interest in ${businessName}. ` +
          "I don't have an approved product or service catalogue connected to this simulator yet, " +
          `but I can direct your enquiry to ${routeTo}. What product or service would you like to know about?`;
      } else if (asksToLeaveMessage.test(text)) {
        category = "message";
        reply = captureContact
          ? "I can help prepare a message for the appropriate team. Please provide only the details needed for the enquiry and your preferred contact method if you want a follow-up. This simulator does not send or deliver messages."
          : "I can outline your enquiry for the appropriate team, but contact-detail collection is disabled. This simulator does not send or deliver messages.";
      } else if (asksForContact.test(text)) {
        category = "contact";
        reply =
          `I can direct your enquiry to ${routeTo}, but verified contact details have not been configured in this simulator. ` +
          "I don't want to provide an unverified phone number or email address.";
      } else if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(text)) {
        category = "greeting";
        reply =
          `Thank you for contacting ${businessName}. ${greeting} ` +
          "What can I help you with today?";
      } else {
        reply =
          `Thank you for contacting ${businessName}. ` +
          `I can help identify your enquiry and direct it to ${routeTo}. ` +
          "Could you tell me a little more about what you need?";
      }

      return res.json({
        success: true,
        mode: "rule_based_simulation",
        reply,
        category,
        escalation,
        intendedTeam: routeTo,
        contactCaptureEnabled: captureContact,
        instructionsConfigured: Boolean(instructions.trim()),
        actionsPerformed: [],
        notice:
          "Simulation only. No live call, transfer, notification or message delivery has occurred.",
      });
    } catch (error) {
      console.error("Receptionist simulation error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to simulate the receptionist response.",
      });
    }
  }
);

export default router;

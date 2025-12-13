/**
 * Telegram Webhook Endpoint
 * Receives updates from Telegram and processes them
 */

import { Router } from "express";
import { processUpdate, sendMessage, type TelegramUpdate } from "./telegram";

export const telegramWebhookRouter = Router();

// Store pending captures (in production, use Redis or database)
const pendingCaptures: Map<string, {
  chatId: number;
  userId: number;
  messages: string[];
  photos: string[];
  startTime: number;
}> = new Map();

/**
 * Webhook endpoint for Telegram bot updates
 * POST /api/telegram/webhook
 */
telegramWebhookRouter.post("/webhook", async (req: any, res: any) => {
  try {
    const update: TelegramUpdate = req.body;
    
    if (!update || !update.message) {
      return res.status(200).json({ ok: true });
    }
    
    const processed = processUpdate(update);
    
    if (!processed) {
      return res.status(200).json({ ok: true });
    }
    
    const { type, chatId, userId, command, text, photos } = processed;
    
    // Handle /capture command
    if (type === "command" && command === "capture") {
      const key = `${chatId}_${userId}`;
      
      // Initialize capture session
      pendingCaptures.set(key, {
        chatId,
        userId,
        messages: [],
        photos: [],
        startTime: Date.now(),
      });
      
      await sendMessage(
        chatId,
        "📝 Capture mode activated! Please forward or paste the conversation messages you want to capture. When done, send /done to process."
      );
      
      return res.status(200).json({ ok: true });
    }
    
    // Handle /done command
    if (type === "command" && command === "done") {
      const key = `${chatId}_${userId}`;
      const capture = pendingCaptures.get(key);
      
      if (!capture) {
        await sendMessage(chatId, "❌ No active capture session. Use /capture to start.");
        return res.status(200).json({ ok: true });
      }
      
      if (capture.messages.length === 0) {
        await sendMessage(chatId, "❌ No messages captured. Please send some messages first.");
        return res.status(200).json({ ok: true });
      }
      
      // Process the captured conversation
      const conversationText = capture.messages.join("\n\n");
      
      await sendMessage(chatId, "🔄 Processing conversation with Morpheus AI...");
      
      try {
        const { extractContactFromConversation } = await import("./morpheus");
        const extracted = await extractContactFromConversation(conversationText);
        
        // Send extracted data for confirmation
        const confirmationText = `✅ Contact extracted:\n\n` +
          `**Name:** ${extracted.name}\n` +
          `**Company:** ${extracted.company || "N/A"}\n` +
          `**Role:** ${extracted.role || "N/A"}\n` +
          `**Email:** ${extracted.email || "N/A"}\n` +
          `**LinkedIn:** ${extracted.linkedinUrl || "N/A"}\n` +
          `**Twitter:** ${extracted.twitterUrl || "N/A"}\n\n` +
          `**Summary:** ${extracted.conversationSummary || "N/A"}\n\n` +
          `To save this contact, please log into the DealFlow Network app and confirm.`;
        
        await sendMessage(chatId, confirmationText, {
          parse_mode: "Markdown",
        });
        
        // Clear the capture session
        pendingCaptures.delete(key);
        
      } catch (error) {
        console.error("Error processing conversation:", error);
        await sendMessage(chatId, "❌ Error processing conversation. Please try again.");
        pendingCaptures.delete(key);
      }
      
      return res.status(200).json({ ok: true });
    }
    
    // Handle /cancel command
    if (type === "command" && command === "cancel") {
      const key = `${chatId}_${userId}`;
      pendingCaptures.delete(key);
      await sendMessage(chatId, "❌ Capture session cancelled.");
      return res.status(200).json({ ok: true });
    }
    
    // Collect messages during capture session
    const key = `${chatId}_${userId}`;
    const capture = pendingCaptures.get(key);
    
    if (capture) {
      if (text) {
        capture.messages.push(text);
      }
      if (photos && photos.length > 0) {
        capture.photos.push(...photos);
      }
      
      // Auto-timeout after 10 minutes
      if (Date.now() - capture.startTime > 10 * 60 * 1000) {
        pendingCaptures.delete(key);
        await sendMessage(chatId, "⏱️ Capture session timed out. Please start again with /capture.");
      }
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
});

/**
 * Health check endpoint
 */
telegramWebhookRouter.get("/health", (req: any, res: any) => {
  res.json({ status: "ok", service: "telegram-webhook" });
});

export default telegramWebhookRouter;

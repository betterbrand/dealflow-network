/**
 * Telegram Bot Service
 * Handles webhook updates, message processing, and API interactions
 */

import { ENV } from "./_core/env";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    width: number;
    height: number;
  }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Get the Telegram bot token from environment
 */
function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN not configured");
  }
  return token;
}

/**
 * Make a request to the Telegram Bot API
 */
async function telegramRequest(method: string, params: Record<string, any> = {}) {
  const token = getBotToken();
  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
  }
  
  return data.result;
}

/**
 * Send a message to a Telegram chat
 */
export async function sendMessage(chatId: number, text: string, options: {
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: any;
} = {}) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

/**
 * Get chat history (recent messages)
 * Note: Bot API doesn't provide direct history access, so we store messages as they come
 */
export async function getChatHistory(chatId: number, limit: number = 100) {
  // The Bot API doesn't support getting historical messages directly
  // We would need to use Telegram Client API (MTProto) for this
  // For now, we'll work with the assumption that the user forwards or shares the conversation
  throw new Error("Chat history retrieval requires Telegram Client API, not available in Bot API");
}

/**
 * Download a file from Telegram
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const token = getBotToken();
  
  // First, get the file path
  const fileInfo = await telegramRequest("getFile", { file_id: fileId });
  const filePath = fileInfo.file_path;
  
  // Download the file
  const fileUrl = `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;
  const response = await fetch(fileUrl);
  
  if (!response.ok) {
    throw new Error("Failed to download file from Telegram");
  }
  
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Set webhook URL for the bot
 */
export async function setWebhook(url: string) {
  return await telegramRequest("setWebhook", { url });
}

/**
 * Delete webhook
 */
export async function deleteWebhook() {
  return await telegramRequest("deleteWebhook");
}

/**
 * Get webhook info
 */
export async function getWebhookInfo() {
  return await telegramRequest("getWebhookInfo");
}

/**
 * Process incoming webhook update
 */
export function processUpdate(update: TelegramUpdate): {
  type: "message" | "command" | "photo" | "unknown";
  chatId: number;
  userId: number;
  text?: string;
  command?: string;
  photos?: string[];
  messageId: number;
} | null {
  if (!update.message) {
    return null;
  }
  
  const message = update.message;
  const chatId = message.chat.id;
  const userId = message.from?.id || 0;
  const messageId = message.message_id;
  
  // Check if it's a command
  if (message.text?.startsWith("/")) {
    const command = message.text.split(" ")[0].substring(1);
    return {
      type: "command",
      chatId,
      userId,
      command,
      text: message.text,
      messageId,
    };
  }
  
  // Check if it has photos
  if (message.photo && message.photo.length > 0) {
    const photos = message.photo.map(p => p.file_id);
    return {
      type: "photo",
      chatId,
      userId,
      photos,
      text: message.text,
      messageId,
    };
  }
  
  // Regular text message
  if (message.text) {
    return {
      type: "message",
      chatId,
      userId,
      text: message.text,
      messageId,
    };
  }
  
  return {
    type: "unknown",
    chatId,
    userId,
    messageId,
  };
}

/**
 * Create inline keyboard for confirmation
 */
export function createConfirmationKeyboard(contactId: number) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Save", callback_data: `save_${contactId}` },
        { text: "✏️ Edit", callback_data: `edit_${contactId}` },
      ],
    ],
  };
}

export type { TelegramUpdate, TelegramMessage, TelegramUser, TelegramChat };

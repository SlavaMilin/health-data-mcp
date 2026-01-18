import type { TelegramClient } from "../types/telegram.types.ts";
import { splitTextByLength } from "../utils/text.utils.ts";

const TELEGRAM_MAX_LENGTH = 4096;

export interface TelegramService {
  send: (text: string) => Promise<void>;
}

export const createTelegramService = (
  client: TelegramClient
): TelegramService => ({
  send: async (text) => {
    const parts = splitTextByLength(text, TELEGRAM_MAX_LENGTH);
    for (const part of parts) {
      await client.sendMessage(part);
      // Small delay between messages to avoid rate limiting
      if (parts.length > 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  },
});

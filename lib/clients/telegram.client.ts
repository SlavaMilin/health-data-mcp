import type {
  TelegramClient,
  TelegramClientConfig,
} from "../types/telegram.types.ts";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

export const createTelegramClient = (
  config: TelegramClientConfig
): TelegramClient => ({
  sendMessage: async (text) => {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as TelegramResponse;
      throw new Error(
        `Telegram error: ${data.description || response.statusText}`
      );
    }
  },
});

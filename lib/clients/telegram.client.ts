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
): TelegramClient => {
  const send = async (text: string, parseMode?: string) => {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`;
    const body: Record<string, string> = { chat_id: config.chatId, text };
    if (parseMode) {
      body.parse_mode = parseMode;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = (await response.json()) as TelegramResponse;
      throw new Error(
        `Telegram error: ${data.description || response.statusText}`
      );
    }
  };

  return {
    sendMessage: async (text) => {
      try {
        await send(text, "Markdown");
      } catch (error) {
        const isParseError =
          error instanceof Error &&
          error.message.includes("can't parse entities");

        if (!isParseError) {
          throw error;
        }

        await send(text);
      }
    },
  };
};

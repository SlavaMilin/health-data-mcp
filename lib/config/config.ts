import "dotenv/config";
import { DEFAULT_DB_PATH } from "../constants/paths.constants.ts";

export interface Config {
  db: string;
  port: number;
  host: string;
  baseUrl: string;
  authToken: string;
  github: {
    clientId?: string;
    clientSecret?: string;
    apiUrl: string;
  };
  gemini: {
    apiKey: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  schedule: {
    timezone: string;
    daily?: string;
    weekly?: string;
    monthly?: string;
  };
  instructionsPath: string;
}

export const loadConfig = (): Config => {
  const config: Config = {
    db: process.env.HEALTH_DB_PATH || DEFAULT_DB_PATH,
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
    authToken: process.env.AUTH_TOKEN || "",
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      apiUrl: process.env.GITHUB_API_URL || "https://github.com",
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      chatId: process.env.TELEGRAM_CHAT_ID || "",
    },
    schedule: {
      timezone: process.env.TIMEZONE || "UTC",
      daily: process.env.CRON_DAILY,
      weekly: process.env.CRON_WEEKLY,
      monthly: process.env.CRON_MONTHLY,
    },
    instructionsPath: "./instructions/ai-instructions.md",
  };

  // Validate required config
  if (!config.authToken) {
    console.error("ERROR: AUTH_TOKEN environment variable is required");
    process.exit(1);
  }

  return config;
};

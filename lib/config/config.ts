import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

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
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, "..", "..", "data", "health_data.db");

export const loadConfig = (): Config => {
  const config: Config = {
    db: process.env.HEALTH_DB_PATH || dbPath,
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
    authToken: process.env.AUTH_TOKEN || "",
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      apiUrl: process.env.GITHUB_API_URL || "https://github.com",
    },
  };

  // Validate required config
  if (!config.authToken) {
    console.error("ERROR: AUTH_TOKEN environment variable is required");
    process.exit(1);
  }

  return config;
};

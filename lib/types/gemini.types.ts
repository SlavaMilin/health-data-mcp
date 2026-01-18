import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

export interface GeminiClientConfig {
  apiKey: string;
}

export interface GeminiClient {
  analyze: (params: {
    systemPrompt: string;
    userMessage: string;
    mcpClient?: Client;
  }) => Promise<string>;
}

import { GoogleGenAI, mcpToTool } from "@google/genai";
import type { GeminiClient, GeminiClientConfig } from "../types/gemini.types.ts";

const GEMINI_MODEL = "gemini-2.5-pro";
const MAX_OUTPUT_TOKENS = 4096;

export const createGeminiClient = (config: GeminiClientConfig): GeminiClient => {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    analyze: async ({ systemPrompt, userMessage, mcpClient }) => {
      const tools = mcpClient ? [mcpToTool(mcpClient)] : [];

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          tools,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });

      return response.text || "";
    },
  };
};

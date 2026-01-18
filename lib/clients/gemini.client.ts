import { GoogleGenAI, mcpToTool } from "@google/genai";
import type { GeminiClient, GeminiClientConfig } from "../types/gemini.types.ts";
import { createConsoleLogger } from "../infrastructure/logger.ts";

const logger = createConsoleLogger();

export const GeminiModel = {
  PRO: "gemini-2.5-pro",
  FLASH: "gemini-2.5-flash",
} as const;

export type GeminiModelType = (typeof GeminiModel)[keyof typeof GeminiModel];

const GEMINI_MODEL: GeminiModelType = GeminiModel.PRO;
const MAX_OUTPUT_TOKENS = 16384;

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

      // Collect text from all AFC turns (Pro model) or just final response (Flash)
      const allTextParts: string[] = [];

      const afcHistory = response.automaticFunctionCallingHistory;
      if (afcHistory) {
        logger.info({ historyLength: afcHistory.length }, "AFC history turns");
        for (const content of afcHistory) {
          if (content.role === "model" && content.parts) {
            for (const part of content.parts) {
              if (part.text) {
                allTextParts.push(part.text);
                logger.info(
                  { textPreview: part.text.substring(0, 100), textLength: part.text.length },
                  "AFC history text part"
                );
              }
            }
          }
        }
      }

      if (response.text) {
        allTextParts.push(response.text);
        logger.info(
          { textPreview: response.text.substring(0, 100), textLength: response.text.length },
          "Final response text"
        );
      }

      const fullText = allTextParts.join("\n\n");
      logger.info({ fullTextLength: fullText.length }, "Combined text length");

      return fullText;
    },
  };
};

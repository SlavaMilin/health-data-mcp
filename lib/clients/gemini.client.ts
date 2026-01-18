import { GoogleGenAI, mcpToTool } from "@google/genai";
import type { GeminiClient, GeminiClientConfig } from "../types/gemini.types.ts";
import { createConsoleLogger } from "../infrastructure/logger.ts";

const logger = createConsoleLogger();

const GEMINI_MODEL = "gemini-2.5-pro";
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

      // Collect text from all AFC turns, not just the final response
      const allTextParts: string[] = [];

      // Extract text from AFC history (intermediate turns)
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

      // Add text from final response
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

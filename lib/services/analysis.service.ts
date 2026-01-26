import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { AnalysisHistoryPort, InstructionsPort } from "../domain/analysis.port.ts";
import type { GeminiClient } from "../types/gemini.types.ts";
import type { AnalysisType, SaveAnalysisParams, AnalysisRecord } from "../domain/analysis.ts";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";
import { calculatePeriodDate } from "../utils/date.utils.ts";

export interface GeneratedAnalysis {
  date: string;
  type: AnalysisType;
  analysis: string;
}

export interface AnalysisService {
  generate: (type?: AnalysisType) => Promise<GeneratedAnalysis>;
  save: (params: SaveAnalysisParams) => number;
  getByDateAndType: (date: string, type: AnalysisType) => AnalysisRecord | undefined;
  getRecentByType: (type: AnalysisType, limit: number) => AnalysisRecord[];
}

export interface AnalysisServiceDeps {
  geminiClient: GeminiClient;
  instructionsRepo: InstructionsPort;
  analysisHistoryRepo: AnalysisHistoryPort;
  mcpClient: Client;
  timezone: string;
}

export const createAnalysisService = ({
  geminiClient,
  instructionsRepo,
  analysisHistoryRepo,
  mcpClient,
  timezone,
}: AnalysisServiceDeps): AnalysisService => ({
  generate: async (type = ANALYSIS_TYPE.WEEKLY) => {
    const systemPrompt = instructionsRepo.get(type);
    const { date, periodStart, periodEnd, today } = calculatePeriodDate(
      type,
      timezone
    );

    const userMessage = `
Today: ${today}
Analyze my health data.
Period: ${periodStart} to ${periodEnd}
Type: ${type}

IMPORTANT: Do not comment on data gathering process. No "let me check", "querying data", "wait" etc. Output only the final analysis.

Format: Telegram Markdown (CRITICAL - invalid markdown = message won't be delivered)
- Lists: use • or -, NEVER *
- *bold* and _italic_ — always close tags
- No nested formatting
    `.trim();

    const analysis = await geminiClient.analyze({
      systemPrompt,
      userMessage,
      mcpClient,
    });

    return { date, type, analysis };
  },

  save: (params) => analysisHistoryRepo.save(params),

  getByDateAndType: (date, type) => analysisHistoryRepo.getByDateAndType(date, type),

  getRecentByType: (type, limit) => analysisHistoryRepo.getRecentByType(type, limit),
});

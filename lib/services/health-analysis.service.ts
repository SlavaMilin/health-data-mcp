import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { AnalysisHistoryRepository } from "../repositories/analysis-history.repository.ts";
import type { InstructionsRepository } from "../repositories/instructions.repository.ts";
import type { TelegramService } from "./telegram.service.ts";
import type { GeminiClient } from "../types/gemini.types.ts";
import type { AnalysisType } from "../types/analysis.types.ts";
import { ANALYSIS_TYPE } from "../constants/analysis.constants.ts";
import { calculatePeriodDate } from "../utils/date.utils.ts";

export interface HealthAnalysisService {
  run: (type?: AnalysisType) => Promise<void>;
}

export interface HealthAnalysisServiceDeps {
  geminiClient: GeminiClient;
  telegramService: TelegramService;
  analysisHistoryRepo: AnalysisHistoryRepository;
  instructionsRepo: InstructionsRepository;
  mcpClient: Client;
  timezone: string;
}

export const createHealthAnalysisService = ({
  geminiClient,
  telegramService,
  analysisHistoryRepo,
  instructionsRepo,
  mcpClient,
  timezone,
}: HealthAnalysisServiceDeps): HealthAnalysisService => ({
  run: async (type = ANALYSIS_TYPE.WEEKLY) => {
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

    analysisHistoryRepo.save({ date, type, analysis });
    await telegramService.send(analysis);
  },
});

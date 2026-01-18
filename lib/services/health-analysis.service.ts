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
}

export const createHealthAnalysisService = ({
  geminiClient,
  telegramService,
  analysisHistoryRepo,
  instructionsRepo,
  mcpClient,
}: HealthAnalysisServiceDeps): HealthAnalysisService => ({
  run: async (type = ANALYSIS_TYPE.WEEKLY) => {
    const systemPrompt = instructionsRepo.get();
    const { date, periodStart, periodEnd } = calculatePeriodDate(type);

    const userMessage = `
Analyze my health data.
Period: ${periodStart} to ${periodEnd}
Type: ${type}
Format: Telegram Markdown
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

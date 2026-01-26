import type { FastifyRequest, FastifyReply } from "fastify";
import type { AnalysisService } from "../services/analysis.service.ts";
import type { TelegramService } from "../services/telegram.service.ts";
import type { AnalysisType } from "../domain/analysis.ts";
import { runAnalysisQuerySchema } from "../schemas/analysis.schemas.ts";

interface AnalysisSuccessResponse {
  success: true;
  message: string;
}

interface AnalysisErrorResponse {
  success: false;
  error: string;
}

export interface AnalysisHandler {
  runAnalysis: (type?: AnalysisType) => Promise<void>;
  handleRunAnalysis: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<AnalysisSuccessResponse | AnalysisErrorResponse>;
}

export interface AnalysisHandlerDeps {
  analysisService: AnalysisService;
  telegramService: TelegramService;
}

export const createAnalysisHandler = ({
  analysisService,
  telegramService,
}: AnalysisHandlerDeps): AnalysisHandler => {
  const runAnalysis = async (type?: AnalysisType) => {
    const result = await analysisService.generate(type);
    analysisService.save(result);
    await telegramService.send(result.analysis);
  };

  return {
    runAnalysis,

    handleRunAnalysis: async (request, reply) => {
      const parseResult = runAnalysisQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: parseResult.error.message,
        });
      }

      try {
        await runAnalysis(parseResult.data.type);
        return { success: true, message: "Analysis sent to Telegram" };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  };
};

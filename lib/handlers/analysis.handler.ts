import type { FastifyRequest, FastifyReply } from "fastify";
import type { HealthAnalysisService } from "../services/health-analysis.service.ts";
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
  runAnalysis: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<AnalysisSuccessResponse | AnalysisErrorResponse>;
}

export const createAnalysisHandler = (
  healthAnalysisService: HealthAnalysisService
): AnalysisHandler => ({
  runAnalysis: async (request, reply) => {
    const parseResult = runAnalysisQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({
        success: false,
        error: parseResult.error.message,
      });
    }

    try {
      await healthAnalysisService.run(parseResult.data.type);
      return { success: true, message: "Analysis sent to Telegram" };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

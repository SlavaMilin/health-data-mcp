import type { FastifyInstance } from "fastify";
import type { AnalysisHandler } from "../handlers/analysis.handler.ts";

export const registerAnalysisRoutes = (
  fastify: FastifyInstance,
  analysisHandler: AnalysisHandler
) => {
  fastify.post("/api/run-analysis", analysisHandler.handleRunAnalysis);
};

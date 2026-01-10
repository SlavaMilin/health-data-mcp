import type { FastifyInstance } from "fastify";
import type { HealthImportHandler } from "../handlers/health-import.handler.ts";

export const registerHealthImportRoutes = (
  fastify: FastifyInstance,
  healthImportHandler: HealthImportHandler,
) => {
  fastify.post("/health/import", healthImportHandler.handleImport);
};

import type { FastifyRequest, FastifyReply } from "fastify";
import type { HealthImportService } from "../services/health-import.service.ts";
import type { HealthImportResult } from "../domain/health.ts";
import { healthImportSchema } from "../schemas/health-import.schemas.ts";

interface HealthImportSuccessResponse extends HealthImportResult {
  success: true;
}

interface HealthImportErrorResponse {
  error: string;
}

export interface HealthImportHandler {
  handleImport: (request: FastifyRequest, reply: FastifyReply) => Promise<HealthImportSuccessResponse | HealthImportErrorResponse>;
}

export const createHealthImportHandler = (
  healthImportService: HealthImportService
): HealthImportHandler => {
  return {
    handleImport: async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = healthImportSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({ error: `Invalid JSON data: ${parseResult.error.message}` });
      }

      try {
        const result = await healthImportService.importHealthData(parseResult.data);
        return { success: true as const, ...result };
      } catch (error) {
        if (error instanceof Error) {
          request.log.error(error);
          return reply.code(500).send({ error: error.message });
        }
        throw error;
      }
    },
  };
};

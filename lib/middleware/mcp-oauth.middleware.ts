import type { FastifyRequest, FastifyReply } from "fastify";
import type { KeyvRepository } from "../repositories/keyv.repository.ts";

export const createMcpOAuthMiddleware = (
  oauthTokensRepo: KeyvRepository<boolean>
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith("/sse")) {
      return;
    }

    const authHeader = request.headers["authorization"];
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      request.log.warn({ url: request.url, method: request.method }, "MCP request without OAuth token");
      return reply.code(401).send({
        error: "Unauthorized",
        message: "OAuth token required. Please authorize first.",
      });
    }

    const isValid = await oauthTokensRepo.has(token);
    if (!isValid) {
      request.log.warn({ url: request.url, method: request.method }, "MCP request with invalid OAuth token");
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid OAuth token. Please re-authorize.",
      });
    }

    request.log.info({ url: request.url, method: request.method }, "MCP request authenticated via OAuth");
  };
};

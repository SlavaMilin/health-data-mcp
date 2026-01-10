import type { FastifyRequest, FastifyReply } from "fastify";
import type { Config } from "../config/config.ts";

export const createAuthMiddleware = (config: Config) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Only /health/import requires AUTH_TOKEN
    if (!request.url.startsWith("/health/import")) {
      return;
    }

    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method
    );

    if (!isWriteMethod) {
      return;
    }

    // Require Bearer AUTH_TOKEN (not OAuth!)
    const token = request.headers["authorization"]?.replace("Bearer ", "");
    if (token && token === config.authToken) {
      return;
    }

    return reply.code(401).send({ error: "Unauthorized" });
  };
};

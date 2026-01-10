import type { FastifyInstance } from "fastify";

export const registerHealthRoutes = (fastify: FastifyInstance) => {
  fastify.get("/health", async () => ({
    status: "ok",
    service: "health-data-mcp",
  }));
};

import type { FastifyInstance } from "fastify";
import type { McpTransportHandler } from "../handlers/mcp-transport.handler.ts";

export const registerMcpRoutes = (
  fastify: FastifyInstance,
  mcpTransportHandler: McpTransportHandler,
) => {
  fastify.post("/sse", mcpTransportHandler.handlePost);
  fastify.get("/sse", mcpTransportHandler.handleGet);
};

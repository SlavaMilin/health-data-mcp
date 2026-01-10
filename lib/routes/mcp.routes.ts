import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { McpTransportHandler } from "../handlers/mcp-transport.handler.ts";
import type { JsonRpcRequest } from "../types/mcp.types.ts";

export const registerMcpRoutes = (
  fastify: FastifyInstance,
  mcpTransportHandler: McpTransportHandler,
) => {
  fastify.post("/sse", async (request: FastifyRequest<{ Body: JsonRpcRequest | JsonRpcRequest[] }>, reply: FastifyReply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    await mcpTransportHandler.handlePost(sessionId, request.body, request, reply);
  });

  // MCP GET - establishes SSE stream
  fastify.get("/sse", async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.headers["mcp-session-id"] as string;
    await mcpTransportHandler.handleGet(sessionId, request, reply);
  });
};

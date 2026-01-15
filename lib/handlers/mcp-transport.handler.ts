import crypto from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { setupServer } from "../stdio-server.ts";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { McpTransportsRepository } from "../repositories/mcp-transports.repository.ts";
import type { JsonRpcRequest, JsonRpcError } from "../types/mcp.types.ts";
import type { Logger } from "../types/logger.types.ts";

export interface McpTransportHandler {
  createAndConnectTransport: () => Promise<{
    transport: StreamableHTTPServerTransport;
    sessionId: string;
  }>;

  handlePost: (
    request: FastifyRequest<{ Body: JsonRpcRequest | JsonRpcRequest[] }>,
    reply: FastifyReply
  ) => Promise<void>;

  handleGet: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<void>;
}

export const createMcpTransportHandler = (
  transportsRepo: McpTransportsRepository,
  logger: Logger
): McpTransportHandler => {
  const createJsonRpcError = (code: number, message: string, id: string | number | null = null): JsonRpcError => ({
    jsonrpc: "2.0",
    error: { code, message },
    id,
  });

  // Extract as closure function to avoid recursive handler creation
  const createAndConnectTransport = async () => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        logger.info({ sessionId }, "Session initialized");
        transportsRepo.set(sessionId, transport);
      },
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId && transportsRepo.has(sessionId)) {
        logger.info({ sessionId }, "Transport closed");
        transportsRepo.delete(sessionId);
      }
    };

    transport.onerror = (error: Error) => {
      logger.error({ error, sessionId: transport.sessionId }, "Transport error");
    };

    const server = setupServer();
    await server.connect(transport);
    logger.info({ sessionId: transport.sessionId }, "MCP server connected");

    return {
      transport,
      sessionId: transport.sessionId!,
    };
  };

  return {
    createAndConnectTransport,

    handlePost: async (
      request: FastifyRequest<{ Body: JsonRpcRequest | JsonRpcRequest[] }>,
      reply: FastifyReply
    ) => {
      const sessionId = request.headers["mcp-session-id"] as string | undefined;
      const body = request.body;
      const isInitRequest = body && isInitializeRequest(body);

      logger.info({ sessionId, isInitRequest }, "MCP POST request");

      try {
        // Reuse existing transport if session exists
        if (sessionId && transportsRepo.has(sessionId)) {
          const transport = transportsRepo.get(sessionId)!;
          await transport.handleRequest(request.raw, reply.raw, body);
          return;
        }

        // Create new transport for initialization requests
        if (!sessionId && isInitRequest) {
          const { transport } = await createAndConnectTransport();
          await transport.handleRequest(request.raw, reply.raw, body);
          return;
        }

        // Invalid request
        logger.warn({ sessionId, isInitRequest }, "Invalid MCP request");
        return reply
          .code(400)
          .send(createJsonRpcError(-32000, "Bad Request: Invalid session"));
      } catch (error) {
        logger.error({ error, sessionId }, "MCP request failed");
        if (!reply.sent) {
          return reply
            .code(500)
            .send(createJsonRpcError(-32603, "Internal server error"));
        }
      }
    },

    handleGet: async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = request.headers["mcp-session-id"] as string | undefined;

      if (!sessionId || !transportsRepo.has(sessionId)) {
        logger.warn({ sessionId }, "Invalid session for SSE stream");
        return reply.code(400).send("Invalid or missing session ID");
      }

      const lastEventId = request.headers["last-event-id"];
      logger.info({ sessionId, lastEventId }, "SSE stream requested");

      try {
        const transport = transportsRepo.get(sessionId)!;
        await transport.handleRequest(request.raw, reply.raw);
      } catch (error) {
        logger.error({ error, sessionId }, "SSE stream failed");
        if (!reply.sent) {
          return reply.code(500).send("Error establishing SSE stream");
        }
      }
    },
  };
};

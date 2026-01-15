import { describe, it, expect, vi } from "vitest";
import { createMcpTransportHandler } from "./mcp-transport.handler.ts";

describe("McpTransportHandler", () => {
  describe("handlePost", () => {
    it("should reuse existing transport for valid session", async () => {
      const mockTransport = {
        handleRequest: vi.fn().mockResolvedValue(undefined),
      };

      const mockTransportsRepo = new Map();
      mockTransportsRepo.set("session-123", mockTransport);

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const body = { method: "some-method" };
      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "session-123" },
        body,
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        sent: false,
      };

      await handler.handlePost(mockRequest, mockReply);

      expect(mockTransport.handleRequest).toHaveBeenCalledWith(
        mockRequest.raw,
        mockReply.raw,
        body
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { sessionId: "session-123", isInitRequest: false },
        "MCP POST request"
      );
    });

    it("should return 400 for invalid session without init request", async () => {
      const mockTransportsRepo = new Map();

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const body = { method: "not-initialize" };
      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "invalid-session" },
        body,
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnValue(undefined),
        sent: false,
      };

      await handler.handlePost(mockRequest, mockReply);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { sessionId: "invalid-session", isInitRequest: false },
        "Invalid MCP request"
      );
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: Invalid session" },
        id: null,
      });
    });

    it("should return 500 on transport error", async () => {
      const mockTransport = {
        handleRequest: vi.fn().mockRejectedValue(new Error("Transport error")),
      };

      const mockTransportsRepo = new Map();
      mockTransportsRepo.set("session-123", mockTransport);

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const body = { method: "some-method" };
      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "session-123" },
        body,
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnValue(undefined),
        sent: false,
      };

      await handler.handlePost(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    });

    it("should not send error if reply already sent", async () => {
      const mockTransport = {
        handleRequest: vi.fn().mockRejectedValue(new Error("Transport error")),
      };

      const mockTransportsRepo = new Map();
      mockTransportsRepo.set("session-123", mockTransport);

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const body = { method: "some-method" };
      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "session-123" },
        body,
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        sent: true, // Already sent
      };

      await handler.handlePost(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockReply.code).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });
  });

  describe("handleGet", () => {
    it("should handle SSE stream for valid session", async () => {
      const mockTransport = {
        handleRequest: vi.fn().mockResolvedValue(undefined),
      };

      const mockTransportsRepo = new Map();
      mockTransportsRepo.set("session-123", mockTransport);

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const mockRequest = {
        raw: {},
        headers: {
          "mcp-session-id": "session-123",
          "last-event-id": "event-456",
        },
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        sent: false,
      };

      await handler.handleGet(mockRequest, mockReply);

      expect(mockTransport.handleRequest).toHaveBeenCalledWith(
        mockRequest.raw,
        mockReply.raw
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { sessionId: "session-123", lastEventId: "event-456" },
        "SSE stream requested"
      );
    });

    it("should return 400 for invalid session", async () => {
      const mockTransportsRepo = new Map();

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "invalid-session" },
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnValue(undefined),
        sent: false,
      };

      await handler.handleGet(mockRequest, mockReply);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { sessionId: "invalid-session" },
        "Invalid session for SSE stream"
      );
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith("Invalid or missing session ID");
    });

    it("should return 500 on transport error", async () => {
      const mockTransport = {
        handleRequest: vi.fn().mockRejectedValue(new Error("SSE error")),
      };

      const mockTransportsRepo = new Map();
      mockTransportsRepo.set("session-123", mockTransport);

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "session-123" },
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnValue(undefined),
        sent: false,
      };

      await handler.handleGet(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith("Error establishing SSE stream");
    });

    it("should not send error if reply already sent", async () => {
      const mockTransport = {
        handleRequest: vi.fn().mockRejectedValue(new Error("SSE error")),
      };

      const mockTransportsRepo = new Map();
      mockTransportsRepo.set("session-123", mockTransport);

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const handler = createMcpTransportHandler(mockTransportsRepo, mockLogger);

      const mockRequest = {
        raw: {},
        headers: { "mcp-session-id": "session-123" },
      };
      const mockReply = {
        raw: {},
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        sent: true, // Already sent
      };

      await handler.handleGet(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockReply.code).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });
  });
});

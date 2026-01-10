import { describe, it, expect, vi } from "vitest";
import { createOAuthHandler } from "./oauth.handler.ts";

describe("OAuthHandler", () => {
  describe("handleRegisterClient", () => {
    it("should successfully register a client", async () => {
      const mockOAuthService = {
        registerClient: vi.fn().mockResolvedValue({
          client_id: "test-client-id",
          client_secret: "test-secret",
        }),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: {
          redirect_uris: ["http://localhost:3000/callback"],
          client_name: "Test Client",
          grant_types: ["authorization_code"],
          response_types: ["code"],
        },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const result = await handler.handleRegisterClient(mockRequest, mockReply);

      expect(result).toEqual({
        client_id: "test-client-id",
        client_secret: "test-secret",
      });
      expect(mockOAuthService.registerClient).toHaveBeenCalledWith({
        redirect_uris: ["http://localhost:3000/callback"],
        client_name: "Test Client",
        grant_types: ["authorization_code"],
        response_types: ["code"],
      });
    });

    it("should return 400 on validation error", async () => {
      const mockOAuthService = {
        registerClient: vi.fn(),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: { redirect_uris: ["invalid-uri"] },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleRegisterClient(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "invalid_request",
        error_description: expect.stringContaining("Invalid URL"),
      });
      expect(mockOAuthService.registerClient).not.toHaveBeenCalled();
    });
  });

  describe("handleMcpAuthorize", () => {
    it("should redirect to GitHub auth URL", async () => {
      const mockOAuthService = {
        startMcpAuthFlow: vi.fn().mockResolvedValue("https://github.com/login/oauth/authorize?..."),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        query: {
          state: "test-state",
          redirect_uri: "http://localhost/callback",
          client_id: "test-client",
          code_challenge: "challenge",
          code_challenge_method: "S256",
        },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        redirect: vi.fn(),
      };

      await handler.handleMcpAuthorize(mockRequest, mockReply);

      expect(mockOAuthService.startMcpAuthFlow).toHaveBeenCalledWith({
        state: "test-state",
        redirect_uri: "http://localhost/callback",
        client_id: "test-client",
        code_challenge: "challenge",
        code_challenge_method: "S256",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith("https://github.com/login/oauth/authorize?...");
    });

    it("should return 400 on invalid request", async () => {
      const mockOAuthService = {
        startMcpAuthFlow: vi.fn(),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        query: {},
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        redirect: vi.fn(),
      };

      await handler.handleMcpAuthorize(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "invalid_request",
        error_description: expect.any(String),
      });
      expect(mockOAuthService.startMcpAuthFlow).not.toHaveBeenCalled();
    });
  });

  describe("handleCallback", () => {
    it("should redirect to client redirect URI", async () => {
      const mockOAuthService = {
        handleCallback: vi.fn().mockResolvedValue("http://localhost/callback?code=auth-code"),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const flowId = "caacef8a-8553-45ee-8b10-1d75cb191524";
      const mockRequest = {
        params: { flowId },
        query: { code: "github-code", state: "test-state" },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        redirect: vi.fn(),
      };

      await handler.handleCallback(mockRequest, mockReply);

      expect(mockOAuthService.handleCallback).toHaveBeenCalledWith({
        flowId,
        code: "github-code",
        state: "test-state",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith("http://localhost/callback?code=auth-code");
    });

    it("should return 400 on validation error", async () => {
      const mockOAuthService = {
        handleCallback: vi.fn(),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        params: {},
        query: {},
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        redirect: vi.fn(),
      };

      await handler.handleCallback(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "invalid_request",
        error_description: expect.any(String),
      });
      expect(mockOAuthService.handleCallback).not.toHaveBeenCalled();
    });

    it("should return 500 on service error", async () => {
      const mockOAuthService = {
        handleCallback: vi.fn().mockRejectedValue(new Error("Invalid state")),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        params: { flowId: "caacef8a-8553-45ee-8b10-1d75cb191524" },
        query: { code: "code", state: "wrong-state" },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
        redirect: vi.fn(),
      };

      await handler.handleCallback(mockRequest, mockReply);

      expect(mockRequest.log.error).toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "server_error",
        error_description: "Invalid state",
      });
    });
  });

  describe("handleTokenExchange", () => {
    it("should successfully exchange token", async () => {
      const mockOAuthService = {
        exchangeToken: vi.fn().mockResolvedValue({
          access_token: "token-123",
          token_type: "Bearer",
        }),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: {
          code: "auth-code",
          grant_type: "authorization_code",
          redirect_uri: "http://localhost/callback",
          code_verifier: "verifier",
        },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const result = await handler.handleTokenExchange(mockRequest, mockReply);

      expect(result).toEqual({
        access_token: "token-123",
        token_type: "Bearer",
      });
      expect(mockOAuthService.exchangeToken).toHaveBeenCalledWith({
        code: "auth-code",
        grant_type: "authorization_code",
        redirect_uri: "http://localhost/callback",
        code_verifier: "verifier",
      });
    });

    it("should return 400 for unsupported grant type", async () => {
      const mockOAuthService = {
        exchangeToken: vi.fn().mockRejectedValue(new Error("unsupported_grant_type: password not supported")),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: {
          grant_type: "password",
          code: "some-code",
          redirect_uri: "http://localhost/callback",
        },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleTokenExchange(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "unsupported_grant_type",
        error_description: "unsupported_grant_type: password not supported",
      });
    });

    it("should return 400 for invalid request (missing required fields)", async () => {
      const mockOAuthService = {
        exchangeToken: vi.fn(),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: { grant_type: "authorization_code" },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleTokenExchange(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "invalid_request",
        error_description: expect.any(String),
      });
      expect(mockOAuthService.exchangeToken).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid grant", async () => {
      const mockOAuthService = {
        exchangeToken: vi.fn().mockRejectedValue(new Error("invalid_grant: code expired")),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: {
          code: "expired-code",
          grant_type: "authorization_code",
          redirect_uri: "http://localhost/callback",
        },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleTokenExchange(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "invalid_grant",
        error_description: "invalid_grant: code expired",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      const mockOAuthService = {
        exchangeToken: vi.fn().mockRejectedValue(new Error("Database connection failed")),
      };

      const handler = createOAuthHandler(mockOAuthService);

      const mockRequest = {
        body: {
          code: "code",
          grant_type: "authorization_code",
          redirect_uri: "http://localhost/callback",
        },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleTokenExchange(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: "server_error" });
    });
  });
});

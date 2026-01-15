import type { FastifyInstance } from "fastify";
import type { OAuthHandler } from "../handlers/oauth.handler.ts";

interface OAuthRoutesOptions {
  enableCallback: boolean;
}

export const registerOAuthRoutes = (
  fastify: FastifyInstance,
  oauthHandler: OAuthHandler,
  options: OAuthRoutesOptions,
) => {
  // Dynamic Client Registration (RFC 7591)
  fastify.post("/oauth/register", oauthHandler.handleRegisterClient);

  // MCP Authorization - starts GitHub OAuth
  fastify.get("/mcp/authorize", oauthHandler.handleMcpAuthorize);

  // OAuth Callback - receives code from GitHub
  if (options.enableCallback) {
    fastify.get("/oauth/callback/:flowId", oauthHandler.handleCallback);
  }

  // Token Endpoint - exchanges authorization code for access token
  fastify.post("/oauth/token", oauthHandler.handleTokenExchange);

  // OAuth Discovery Endpoints
  fastify.get("/.well-known/oauth-authorization-server", oauthHandler.handleAuthServerMetadata);
  fastify.get("/.well-known/oauth-protected-resource", oauthHandler.handleProtectedResourceMetadata);
  fastify.get("/.well-known/oauth-protected-resource/sse", oauthHandler.handleSseProtectedResourceMetadata);
};

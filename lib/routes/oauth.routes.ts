import type { FastifyInstance } from "fastify";
import type { OAuthHandler } from "../handlers/oauth.handler.ts";
import type { OAuthService } from "../services/oauth.service.ts";
import type { Config } from "../config/config.ts";

export const registerOAuthRoutes = (
  fastify: FastifyInstance,
  oauthHandler: OAuthHandler,
  oauthService: OAuthService,
  config: Config,
) => {
  // Dynamic Client Registration (RFC 7591)
  fastify.post("/oauth/register", oauthHandler.handleRegisterClient);

  // MCP Authorization - starts GitHub OAuth
  fastify.get("/mcp/authorize", oauthHandler.handleMcpAuthorize);

  // OAuth Callback - receives code from GitHub
  if (config.github.clientId && config.github.clientSecret) {
    fastify.get("/oauth/callback/:flowId", oauthHandler.handleCallback);
  }

  // Token Endpoint - exchanges authorization code for access token
  fastify.post("/oauth/token", oauthHandler.handleTokenExchange);

  // OAuth Discovery Endpoints
  const oauthMeta = oauthService.getMetadata();

  fastify.get("/.well-known/oauth-authorization-server", async () => ({
    issuer: config.baseUrl,
    authorization_endpoint: `${config.baseUrl}/mcp/authorize`,
    token_endpoint: `${config.baseUrl}/oauth/token`,
    registration_endpoint: `${config.baseUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  }));

  fastify.get("/.well-known/oauth-protected-resource", async () => ({
    resource: config.baseUrl,
    authorization_servers: [config.baseUrl],
    ...oauthMeta,
  }));

  fastify.get("/.well-known/oauth-protected-resource/sse", async () => ({
    resource: `${config.baseUrl}/sse`,
    authorization_servers: [config.baseUrl],
    ...oauthMeta,
  }));
};

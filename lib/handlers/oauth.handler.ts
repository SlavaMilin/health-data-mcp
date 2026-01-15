import type { FastifyRequest, FastifyReply } from "fastify";
import type { OAuthService } from "../services/oauth.service.ts";
import type { ClientMetadata, TokenResponse, OAuthErrorResponse, OAuthServerMetadata, OAuthProtectedResourceMetadata } from "../types/oauth.types.ts";
import {
  registerClientSchema,
  authorizeQuerySchema,
  callbackParamsSchema,
  callbackQuerySchema,
  tokenExchangeSchema,
} from "../schemas/oauth.schemas.ts";

export interface OAuthHandler {
  handleRegisterClient: (request: FastifyRequest, reply: FastifyReply) => Promise<ClientMetadata | OAuthErrorResponse>;
  handleMcpAuthorize: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  handleCallback: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  handleTokenExchange: (request: FastifyRequest, reply: FastifyReply) => Promise<TokenResponse | OAuthErrorResponse>;
  handleAuthServerMetadata: () => OAuthServerMetadata;
  handleProtectedResourceMetadata: () => OAuthProtectedResourceMetadata;
  handleSseProtectedResourceMetadata: () => OAuthProtectedResourceMetadata;
}

interface OAuthHandlerDeps {
  oauthService: OAuthService;
  baseUrl: string;
}

export const createOAuthHandler = (deps: OAuthHandlerDeps): OAuthHandler => {
  const { oauthService, baseUrl } = deps;

  return {
    handleAuthServerMetadata: () => ({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/mcp/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    }),

    handleProtectedResourceMetadata: () => ({
      resource: baseUrl,
      authorization_servers: [baseUrl],
      ...oauthService.getMetadata(),
    }),

    handleSseProtectedResourceMetadata: () => ({
      resource: `${baseUrl}/sse`,
      authorization_servers: [baseUrl],
      ...oauthService.getMetadata(),
    }),

    handleRegisterClient: async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = registerClientSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: "invalid_request",
          error_description: parseResult.error.message,
        });
      }

      try {
        const { redirect_uris, client_name, grant_types, response_types } = parseResult.data;
        return await oauthService.registerClient({
          redirect_uris,
          client_name,
          grant_types,
          response_types,
        });
      } catch (error) {
        if (error instanceof Error) {
          request.log.error(error);
          return reply.code(400).send({
            error: "invalid_redirect_uri",
            error_description: error.message,
          });
        }
        throw error;
      }
    },

    handleMcpAuthorize: async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = authorizeQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: "invalid_request",
          error_description: parseResult.error.message,
        });
      }

      try {
        const { state, redirect_uri, client_id, code_challenge, code_challenge_method } = parseResult.data;
        const githubAuthUrl = await oauthService.startMcpAuthFlow({
          state,
          redirect_uri,
          client_id,
          code_challenge,
          code_challenge_method,
        });
        return reply.redirect(githubAuthUrl);
      } catch (error) {
        if (error instanceof Error) {
          request.log.error(error);
          return reply.code(400).send({
            error: "invalid_request",
            error_description: error.message,
          });
        }
        throw error;
      }
    },

    handleCallback: async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = callbackParamsSchema.safeParse(request.params);
      const queryResult = callbackQuerySchema.safeParse(request.query);

      if (!paramsResult.success || !queryResult.success) {
        return reply.code(400).send({
          error: "invalid_request",
          error_description: paramsResult.error?.message || queryResult.error?.message,
        });
      }

      try {
        const { flowId } = paramsResult.data;
        const { code, state } = queryResult.data;
        const redirectUrl = await oauthService.handleCallback({ flowId, code, state });
        return reply.redirect(redirectUrl);
      } catch (error) {
        if (error instanceof Error) {
          request.log.error(error);
          return reply.code(500).send({
            error: "server_error",
            error_description: error.message,
          });
        }
        throw error;
      }
    },

    handleTokenExchange: async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = tokenExchangeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: "invalid_request",
          error_description: parseResult.error.message,
        });
      }

      try {
        const { code, grant_type, redirect_uri, code_verifier } = parseResult.data;
        return await oauthService.exchangeToken({
          code,
          grant_type,
          redirect_uri,
          code_verifier,
        });
      } catch (error) {
        if (error instanceof Error) {
          request.log.error(error);

          if (error.message.startsWith("unsupported_grant_type")) {
            return reply.code(400).send({
              error: "unsupported_grant_type",
              error_description: error.message,
            });
          }

          if (error.message.startsWith("invalid_request")) {
            return reply.code(400).send({
              error: "invalid_request",
              error_description: error.message,
            });
          }

          if (error.message.startsWith("invalid_grant")) {
            return reply.code(400).send({
              error: "invalid_grant",
              error_description: error.message,
            });
          }

          return reply.code(500).send({ error: "server_error" });
        }
        throw error;
      }
    },
  };
};

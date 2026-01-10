import crypto from "crypto";
import type Keyv from "keyv";
import type { FastifyBaseLogger } from "fastify";
import type { Config } from "../config/config.ts";
import type { ClientMetadata, OAuthSessionData } from "../types/oauth.types.ts";
import type { KeyvRepository } from "../repositories/keyv.repository.ts";

export interface OAuthService {
  startMcpAuthFlow: (params: {
    state: string;
    redirect_uri: string;
    client_id?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }) => Promise<string>;

  handleCallback: (params: {
    flowId: string;
    code: string;
    state: string;
  }) => Promise<string>;

  exchangeToken: (params: {
    code: string;
    grant_type: string;
    redirect_uri: string;
    code_verifier?: string;
  }) => Promise<{ access_token: string; token_type: string; expires_in: number }>;

  registerClient: (params: {
    redirect_uris: string[];
    client_name?: string;
    grant_types?: string[];
    response_types?: string[];
  }) => Promise<ClientMetadata>;

  getMetadata: () => { scopes_supported: string[] };
}

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export const createOAuthService = (deps: {
  config: Config;
  oauthTokensRepo: KeyvRepository<boolean>;
  oauthClientsRepo: KeyvRepository<ClientMetadata>;
  mcpOAuthFlowsStore: Keyv;
  oauthSessionsRepo: KeyvRepository<OAuthSessionData>;
  logger: FastifyBaseLogger;
}): OAuthService => {
  const { config, oauthTokensRepo, oauthClientsRepo, mcpOAuthFlowsStore, oauthSessionsRepo, logger } = deps;
  return {
    // Dynamic Client Registration (RFC 7591)
    registerClient: async (params) => {
      const { redirect_uris, client_name, grant_types, response_types } = params;

      if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        throw new Error("redirect_uris is required and must be a non-empty array");
      }

      const client_id = crypto.randomUUID();
      const client_secret = crypto.randomBytes(32).toString("hex");

      const clientMetadata: ClientMetadata = {
        client_id,
        client_secret,
        redirect_uris,
        client_name: client_name || "MCP Client",
        grant_types: grant_types || ["authorization_code", "refresh_token"],
        response_types: response_types || ["code"],
        token_endpoint_auth_method: "none",
        created_at: Math.floor(Date.now() / 1000),
      };

      await oauthClientsRepo.set(client_id, clientMetadata);
      logger.info({ client_id, client_name }, "OAuth client registered");

      return clientMetadata;
    },

    // Start MCP OAuth flow → redirect to GitHub
    startMcpAuthFlow: async (params) => {
      const { state, redirect_uri, client_id, code_challenge, code_challenge_method } = params;

      if (!state || !redirect_uri) {
        throw new Error("state and redirect_uri are required");
      }

      // Generate unique ID for this OAuth flow
      const flowId = crypto.randomUUID();

      // Save MCP OAuth params in Keyv (persistent storage)
      await mcpOAuthFlowsStore.set(flowId, {
        redirect_uri,
        client_id,
        state,
        code_challenge,
        code_challenge_method,
        created_at: Date.now(),
      });

      logger.info({ flowId, state, redirect_uri, client_id }, "MCP OAuth flow started");

      // Generate CSRF state for GitHub OAuth
      const githubState = crypto.randomBytes(16).toString('hex');
      await mcpOAuthFlowsStore.set(`state:${githubState}`, flowId);

      // Build GitHub OAuth URL
      const githubAuthUrl = new URL(`${config.github.apiUrl}/login/oauth/authorize`);
      githubAuthUrl.searchParams.set('client_id', config.github.clientId!);
      githubAuthUrl.searchParams.set('redirect_uri', `${config.baseUrl}/oauth/callback/${flowId}`);
      githubAuthUrl.searchParams.set('state', githubState);
      githubAuthUrl.searchParams.set('scope', 'user:email');

      logger.info({ flowId, githubAuthUrl: githubAuthUrl.toString() }, "Redirecting to GitHub");

      return githubAuthUrl.toString();
    },

    // Handle GitHub callback → exchange code → redirect back to MCP client
    handleCallback: async (params) => {
      const { flowId, code, state: githubState } = params;

      logger.info({ flowId, code: code?.substring(0, 10), githubState }, "OAuth callback received");

      if (!code || !githubState || !flowId) {
        throw new Error("Missing required parameters");
      }

      // Verify CSRF state
      const storedFlowId = await mcpOAuthFlowsStore.get(`state:${githubState}`);
      if (storedFlowId !== flowId) {
        logger.warn({ flowId, storedFlowId, githubState }, "CSRF state mismatch");
        throw new Error("Invalid state parameter");
      }

      // Get MCP params from Keyv
      const mcpParams = await mcpOAuthFlowsStore.get(flowId);
      if (!mcpParams) {
        logger.warn({ flowId }, "Flow ID not found in Keyv");
        throw new Error("Invalid or expired flow ID");
      }

      // Exchange authorization code for GitHub access token
      const tokenResponse = await fetch(`${config.github.apiUrl}/login/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
          redirect_uri: `${config.baseUrl}/oauth/callback/${flowId}`,
        }),
      });

      const tokenData = await tokenResponse.json() as GitHubTokenResponse;

      if (tokenData.error || !tokenData.access_token) {
        logger.error({ error: tokenData }, "Failed to exchange GitHub code for token");
        throw new Error(tokenData.error_description || "Failed to authenticate with GitHub");
      }

      logger.info({ flowId }, "Successfully obtained GitHub access token");

      // Generate MCP access token
      const mcpToken = crypto.randomUUID();
      await oauthTokensRepo.set(mcpToken, true);

      // Save mapping: authorization code → access token for token endpoint
      const authCode = crypto.randomUUID();
      await oauthSessionsRepo.set(authCode, {
        access_token: mcpToken,
        token_type: "Bearer",
        expires_in: 31536000, // 365 days
        state: mcpParams.state,
        code_challenge: mcpParams.code_challenge,
        code_challenge_method: mcpParams.code_challenge_method,
      });

      // Clean up used data from Keyv
      await mcpOAuthFlowsStore.delete(flowId);
      await mcpOAuthFlowsStore.delete(`state:${githubState}`);

      logger.info({ authCode, redirect_uri: mcpParams.redirect_uri, state: mcpParams.state }, "MCP OAuth flow complete");

      // Redirect back to Claude Code with authorization code
      const redirectUrl = new URL(mcpParams.redirect_uri);
      redirectUrl.searchParams.set("code", authCode);
      redirectUrl.searchParams.set("state", mcpParams.state);

      return redirectUrl.toString();
    },

    // Exchange authorization code for access token
    exchangeToken: async (params) => {
      const { code, grant_type, redirect_uri, code_verifier } = params;

      if (grant_type !== "authorization_code") {
        throw new Error("unsupported_grant_type: Only authorization_code grant type is supported");
      }

      if (!code) {
        throw new Error("invalid_request: code is required");
      }

      // Get token by authorization code
      const tokenData = await oauthSessionsRepo.get(code);

      if (!tokenData) {
        logger.warn({ code }, "Invalid or expired authorization code");
        throw new Error("invalid_grant: Invalid or expired authorization code");
      }

      // Clear used code
      await oauthSessionsRepo.delete(code);

      logger.info({ code }, "Token exchange successful");

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
      };
    },

    // Get OAuth metadata
    getMetadata: () => ({
      scopes_supported: ["mcp:tools", "mcp:resources", "mcp:prompts"],
    }),
  };
};

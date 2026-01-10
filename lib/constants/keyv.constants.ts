export const KEYV_NAMESPACE = {
  OAUTH_TOKENS: "oauth-tokens",
  OAUTH_SESSIONS: "oauth-sessions",
  OAUTH_CLIENTS: "oauth-clients",
  MCP_FLOWS: "mcp-flows",
} as const;

export const KEYV_TTL = {
  ONE_HOUR: 3600000,
  NO_EXPIRATION: 0,
} as const;

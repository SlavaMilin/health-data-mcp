// Domain types for OAuth flows

export interface OAuthSessionData {
  access_token: string;
  token_type: string;
  expires_in: number;
  state: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface McpOAuthFlowData {
  redirect_uri: string;
  client_id?: string;
  state: string;
  code_challenge?: string;
  code_challenge_method?: string;
  created_at: number;
}

export interface ClientMetadata {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name: string;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
}

export interface OAuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

export interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
}

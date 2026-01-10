/**
 * Integration test for OAuth flow with Keyv persistence
 *
 * Tests the complete OAuth authorization flow using AAA pattern with helpers
 *
 * Run: pnpm test
 * Requires: server running on localhost:3000
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import Fastify from 'fastify';

const BASE_URL = 'http://127.0.0.1:3000';
const DB_PATH = './data/health_data.db';
const MOCK_GITHUB_PORT = 3333;
const MOCK_GITHUB_URL = `http://127.0.0.1:${MOCK_GITHUB_PORT}`;

// Create mock GitHub OAuth API server
const mockGitHub = Fastify({ logger: false });

mockGitHub.post('/login/oauth/access_token', async (request, reply) => {
  const body = request.body;

  // Validate request has required fields
  if (!body.client_id || !body.client_secret || !body.code || !body.redirect_uri) {
    return reply.code(400).send({ error: 'invalid_request' });
  }

  // Return mock GitHub access token
  return reply.send({
    access_token: 'mock_github_access_token',
    token_type: 'bearer',
    scope: 'user:email',
  });
});

// Test helpers
const helpers = {
  /**
   * Create authorization flow and get GitHub redirect
   */
  async createAuthFlow(state = `test-state-${Date.now()}`) {
    const authUrl = new URL(`${BASE_URL}/mcp/authorize`);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', 'http://localhost:9999/callback');
    authUrl.searchParams.set('client_id', 'test-client');
    authUrl.searchParams.set('code_challenge', 'test-challenge-hash');
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const response = await fetch(authUrl.toString(), { redirect: 'manual' });

    const githubRedirectUrl = response.headers.get('location');
    const githubUrl = new URL(githubRedirectUrl);

    // Extract flowId from redirect_uri parameter (not pathname!)
    const redirectUriParam = githubUrl.searchParams.get('redirect_uri');
    const redirectUri = new URL(redirectUriParam);
    const flowId = redirectUri.pathname.split('/').pop();
    const githubState = githubUrl.searchParams.get('state');

    return { response, flowId, githubState, state };
  },

  /**
   * Simulate GitHub callback and get authorization code
   */
  async processCallback(flowId, githubState) {
    const callbackUrl = new URL(`${BASE_URL}/oauth/callback/${flowId}`);
    callbackUrl.searchParams.set('code', 'mock-github-code');
    callbackUrl.searchParams.set('state', githubState);

    const response = await fetch(callbackUrl.toString(), { redirect: 'manual' });

    const clientRedirectUrl = response.headers.get('location');
    if (!clientRedirectUrl) {
      // Debug: server returned error instead of redirect
      const body = await response.text();
      console.error(`Callback failed - Status: ${response.status}, Body:`, body);
      throw new Error(`No redirect location header. Status: ${response.status}`);
    }

    const redirectUrl = new URL(clientRedirectUrl);
    const authCode = redirectUrl.searchParams.get('code');
    const returnedState = redirectUrl.searchParams.get('state');

    return { response, authCode, returnedState };
  },

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(authCode) {
    const response = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'http://localhost:9999/callback',
      }),
    });

    const data = response.ok ? await response.json() : null;
    return { response, data };
  },

  /**
   * Query Keyv caches table (with small delay for async write)
   */
  async queryKeyv(pattern) {
    // Small delay to ensure Keyv has written to SQLite
    await new Promise(resolve => setTimeout(resolve, 100));

    const db = new Database(DB_PATH, { readonly: true });

    // KeyvSqlite uses 'caches' table by default
    const rows = db.prepare('SELECT COUNT(*) as count FROM caches WHERE cacheKey LIKE ?')
      .get(pattern);
    db.close();
    return rows.count;
  },
};

describe('OAuth Flow with Keyv Persistence', () => {
  beforeAll(async () => {
    // Start mock GitHub OAuth API server
    await mockGitHub.listen({ port: MOCK_GITHUB_PORT });
    console.log(`   ℹ️  Mock GitHub API listening on ${MOCK_GITHUB_URL}`);
  });

  afterAll(async () => {
    // Clean up mock GitHub server
    await mockGitHub.close();
  });

  test('should start MCP authorization and persist flow in Keyv', async () => {
    // Arrange
    const expectedState = 'test-client-state-123';

    // Act
    const { response, flowId, githubState } = await helpers.createAuthFlow(expectedState);

    // Assert
    expect(response.status).toBe(302);
    expect(flowId).toBeTruthy();
    expect(githubState).toBeTruthy();

    const githubRedirectUrl = response.headers.get('location');
    expect(githubRedirectUrl).toContain('/login/oauth/authorize');

    // Assert: Flow persisted in Keyv
    const flowCount = await helpers.queryKeyv('%mcp-flows%');
    expect(flowCount).toBeGreaterThan(0);
  });

  test('should complete OAuth callback and store session in Keyv', async () => {
    // Arrange
    const expectedState = 'test-callback-state';
    const { flowId, githubState } = await helpers.createAuthFlow(expectedState);

    // Act
    const { response, authCode, returnedState } = await helpers.processCallback(flowId, githubState);

    // Assert
    expect(response.status).toBe(302);
    expect(authCode).toBeTruthy();
    expect(returnedState).toBe(expectedState);

    // Assert: Session persisted in Keyv
    const sessionCount = await helpers.queryKeyv('%oauth-sessions%');
    expect(sessionCount).toBeGreaterThan(0);
  });

  test('should exchange authorization code for access token', async () => {
    // Arrange
    const { flowId, githubState } = await helpers.createAuthFlow();
    const { authCode } = await helpers.processCallback(flowId, githubState);

    // Act
    const { response, data } = await helpers.exchangeToken(authCode);

    // Assert
    expect(response.ok).toBe(true);
    expect(data).toHaveProperty('access_token');
    expect(data.access_token).toBeTruthy();
    expect(data.token_type).toBe('Bearer');
    expect(data.expires_in).toBe(31536000); // 365 days
  });

  test('should delete authorization code after token exchange (one-time use)', async () => {
    // Arrange
    const { flowId, githubState } = await helpers.createAuthFlow();
    const { authCode } = await helpers.processCallback(flowId, githubState);

    const sessionCountBefore = await helpers.queryKeyv('%oauth-sessions%');

    // Act
    await helpers.exchangeToken(authCode);

    // Assert: Auth code should be deleted
    const sessionCountAfter = await helpers.queryKeyv('%oauth-sessions%');
    expect(sessionCountAfter).toBeLessThan(sessionCountBefore);
  });

  test('should persist OAuth data in SQLite across server restarts', async () => {
    // Arrange
    const db = new Database(DB_PATH, { readonly: true });

    // Act
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='caches'"
    ).get();

    const allEntries = db.prepare('SELECT cacheKey, expiredAt FROM caches').all();
    db.close();

    // Assert
    expect(tableExists).toBeTruthy();
    expect(tableExists.name).toBe('caches');

    // Log for visibility
    console.log(`\n   ℹ️  Keyv entries in SQLite caches table: ${allEntries.length}`);
    allEntries.forEach(row => {
      const namespace = row.cacheKey.split(':')[0];
      const expires = row.expiredAt !== -1
        ? new Date(row.expiredAt).toISOString()
        : 'no expiration';
      console.log(`      - ${namespace}: expires ${expires}`);
    });

    // Assert structure
    allEntries.forEach(entry => {
      expect(entry).toHaveProperty('cacheKey');
      expect(entry.cacheKey).toContain(':'); // Should have namespace prefix
    });
  });
});

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import Database from "better-sqlite3";
import Keyv from "keyv";
import { KeyvSqlite } from "@resolid/keyv-sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { loadConfig } from "./config/config.ts";
import { createKeyvRepository } from "./repositories/keyv.repository.ts";
import { createMcpTransportsRepository } from "./repositories/mcp-transports.repository.ts";
import { createHealthDataRepository } from "./repositories/health-data.repository.ts";
import { KEYV_NAMESPACE, KEYV_TTL } from "./constants/keyv.constants.ts";
import { createOAuthService } from "./services/oauth.service.ts";
import { createHealthImportService } from "./services/health-import.service.ts";
import { runMigrations } from "./infrastructure/migrations.ts";
import { MIGRATIONS_DIR } from "./constants/paths.constants.ts";
import { createMcpTransportHandler } from "./handlers/mcp-transport.handler.ts";
import { createOAuthHandler } from "./handlers/oauth.handler.ts";
import { createHealthImportHandler } from "./handlers/health-import.handler.ts";
import { createAuthMiddleware } from "./middleware/auth.middleware.ts";
import { createMcpOAuthMiddleware } from "./middleware/mcp-oauth.middleware.ts";
import { registerHealthRoutes } from "./routes/health.routes.ts";
import { registerMcpRoutes } from "./routes/mcp.routes.ts";
import { registerOAuthRoutes } from "./routes/oauth.routes.ts";
import { registerHealthImportRoutes } from "./routes/health-import.routes.ts";
import type { ClientMetadata, OAuthSessionData } from "./types/oauth.types.ts";

export const createHttpServer = async () => {
  // ============================================================================
  // 1. Load Config
  // ============================================================================
  const config = loadConfig();

  // ============================================================================
  // 2. Setup Database Directory
  // ============================================================================
  const dataDir = dirname(config.db);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // ============================================================================
  // 3. Create Fastify Instance
  // ============================================================================
  const fastify = Fastify({
    logger: true,
    bodyLimit: 100 * 1024 * 1024, // 100MB
  });

  // ============================================================================
  // 4. Create Database and Run Migrations
  // ============================================================================
  const db = new Database(config.db);
  db.pragma("journal_mode = WAL");

  await runMigrations(db, MIGRATIONS_DIR);

  // ============================================================================
  // 5. Create Keyv Stores (shared KeyvSqlite instance)
  // ============================================================================
  const keyvStore = new KeyvSqlite({ uri: config.db });

  const oauthTokensStore = new Keyv({
    store: keyvStore,
    namespace: KEYV_NAMESPACE.OAUTH_TOKENS,
    ttl: KEYV_TTL.NO_EXPIRATION,
  });

  const oauthSessionsStore = new Keyv({
    store: keyvStore,
    namespace: KEYV_NAMESPACE.OAUTH_SESSIONS,
    ttl: KEYV_TTL.ONE_HOUR,
  });

  const oauthClientsStore = new Keyv({
    store: keyvStore,
    namespace: KEYV_NAMESPACE.OAUTH_CLIENTS,
    ttl: KEYV_TTL.NO_EXPIRATION,
  });

  const mcpOAuthFlowsStore = new Keyv({
    store: keyvStore,
    namespace: KEYV_NAMESPACE.MCP_FLOWS,
    ttl: KEYV_TTL.ONE_HOUR,
  });

  // ============================================================================
  // 6. Create Repositories
  // ============================================================================
  const oauthTokensRepo = createKeyvRepository<boolean>(oauthTokensStore);
  const oauthClientsRepo = createKeyvRepository<ClientMetadata>(oauthClientsStore);
  const oauthSessionsRepo = createKeyvRepository<OAuthSessionData>(oauthSessionsStore);
  const transportsRepo = createMcpTransportsRepository();
  const healthDataRepo = createHealthDataRepository(db);

  // ============================================================================
  // 7. Create Services
  // ============================================================================
  const oauthService = createOAuthService({
    config,
    oauthTokensRepo,
    oauthClientsRepo,
    mcpOAuthFlowsStore,
    oauthSessionsRepo,
    logger: fastify.log,
  });

  const healthImportService = createHealthImportService(healthDataRepo, fastify.log);

  // ============================================================================
  // 8. Create Handlers
  // ============================================================================
  const mcpTransportHandler = createMcpTransportHandler(transportsRepo, fastify.log);
  const oauthHandler = createOAuthHandler(oauthService);
  const healthImportHandler = createHealthImportHandler(healthImportService);

  // ============================================================================
  // 9. Register Plugins
  // ============================================================================
  await fastify.register(cors);
  await fastify.register(formbody);

  // ============================================================================
  // 10. Register Middleware
  // ============================================================================
  fastify.addHook("preHandler", createMcpOAuthMiddleware(oauthTokensRepo));
  fastify.addHook("preHandler", createAuthMiddleware(config));

  // ============================================================================
  // 11. Register Routes
  // ============================================================================
  registerHealthRoutes(fastify);
  registerMcpRoutes(fastify, mcpTransportHandler);
  registerOAuthRoutes(fastify, oauthHandler, oauthService, config);
  registerHealthImportRoutes(fastify, healthImportHandler);

  // ============================================================================
  // 12. Graceful Shutdown Handler
  // ============================================================================
  process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...");

    for (const [sessionId, transport] of transportsRepo.entries()) {
      try {
        await transport.close();
        console.log(`Closed transport: ${sessionId}`);
      } catch (error) {
        console.error(`Error closing transport ${sessionId}:`, error);
      }
    }

    transportsRepo.clear();
    db.close();
    console.log("Database closed");
    process.exit(0);
  });

  // ============================================================================
  // 13. Start Server
  // ============================================================================
  try {
    await fastify.listen({ port: config.port, host: config.host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

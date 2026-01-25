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
import { createAnalysisHistoryRepository } from "./repositories/analysis-history.repository.ts";
import { createInstructionsRepository } from "./repositories/instructions.repository.ts";
import { KEYV_NAMESPACE, KEYV_TTL } from "./constants/keyv.constants.ts";
import { createOAuthService } from "./services/oauth.service.ts";
import { createHealthImportService } from "./services/health-import.service.ts";
import { createTelegramService } from "./services/telegram.service.ts";
import { createHealthAnalysisService } from "./services/health-analysis.service.ts";
import { createSchedulerService, type ScheduleConfig } from "./services/scheduler.service.ts";
import { ANALYSIS_TYPE } from "./domain/analysis.constants.ts";
import { runMigrations } from "./infrastructure/migrations.ts";
import { createMcpClient } from "./infrastructure/mcp-client.ts";
import { fromFastifyLogger } from "./infrastructure/logger.ts";
import { MIGRATIONS_DIR } from "./constants/paths.constants.ts";
import { createMcpTransportHandler } from "./handlers/mcp-transport.handler.ts";
import { createOAuthHandler } from "./handlers/oauth.handler.ts";
import { createHealthImportHandler } from "./handlers/health-import.handler.ts";
import { createAnalysisHandler } from "./handlers/analysis.handler.ts";
import { createAuthMiddleware } from "./middleware/auth.middleware.ts";
import { createMcpOAuthMiddleware } from "./middleware/mcp-oauth.middleware.ts";
import { registerHealthRoutes } from "./routes/health.routes.ts";
import { registerMcpRoutes } from "./routes/mcp.routes.ts";
import { registerOAuthRoutes } from "./routes/oauth.routes.ts";
import { registerHealthImportRoutes } from "./routes/health-import.routes.ts";
import { registerAnalysisRoutes } from "./routes/analysis.routes.ts";
import { createTelegramClient } from "./clients/telegram.client.ts";
import { createGeminiClient } from "./clients/gemini.client.ts";
import { setupServer as setupMcpServer } from "./stdio-server.ts";
import {
  timeToDailyCron,
  timeToWeeklyCron,
  timeToMonthlyCron,
} from "./utils/schedule.utils.ts";
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
  const analysisHistoryRepo = createAnalysisHistoryRepository(db);
  const instructionsRepo = createInstructionsRepository(config.instructions);

  // ============================================================================
  // 7. Create Clients
  // ============================================================================
  const telegramClient = createTelegramClient({
    botToken: config.telegram.botToken,
    chatId: config.telegram.chatId,
  });
  const geminiClient = createGeminiClient({ apiKey: config.gemini.apiKey });

  // ============================================================================
  // 8. Create MCP Server & Client
  // ============================================================================
  const mcpServer = await setupMcpServer({
    db: { readDb: db, writeDb: db, dbPath: config.db },
  });
  const mcpClient = await createMcpClient(mcpServer);

  // ============================================================================
  // 9. Create Services
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
  const telegramService = createTelegramService(telegramClient);
  const healthAnalysisService = createHealthAnalysisService({
    geminiClient,
    telegramService,
    analysisHistoryRepo,
    instructionsRepo,
    mcpClient,
    timezone: config.schedule.timezone,
  });

  const schedules: ScheduleConfig[] = [];
  if (config.schedule.dailyTime) {
    const cron = timeToDailyCron(config.schedule.dailyTime);
    if (!cron) {
      fastify.log.error(`Invalid DAILY_TIME: "${config.schedule.dailyTime}", expected HH:MM`);
    }
    if (cron) {
      schedules.push({ type: ANALYSIS_TYPE.DAILY, cron });
    }
  }
  if (config.schedule.weeklyTime) {
    const cron = timeToWeeklyCron(
      config.schedule.weeklyTime,
      config.schedule.weeklyDay
    );
    if (!cron) {
      fastify.log.error(`Invalid WEEKLY_TIME: "${config.schedule.weeklyTime}", expected HH:MM`);
    }
    if (cron) {
      schedules.push({ type: ANALYSIS_TYPE.WEEKLY, cron });
    }
  }
  if (config.schedule.monthlyTime) {
    const cron = timeToMonthlyCron(
      config.schedule.monthlyTime,
      config.schedule.monthlyDay
    );
    if (!cron) {
      fastify.log.error(`Invalid MONTHLY_TIME: "${config.schedule.monthlyTime}", expected HH:MM`);
    }
    if (cron) {
      schedules.push({ type: ANALYSIS_TYPE.MONTHLY, cron });
    }
  }

  const scheduler = createSchedulerService({
    schedules,
    timezone: config.schedule.timezone,
    runAnalysis: (type) => healthAnalysisService.run(type),
    logger: fromFastifyLogger(fastify.log),
  });

  // ============================================================================
  // 10. Create Handlers
  // ============================================================================
  const mcpTransportHandler = createMcpTransportHandler(transportsRepo, fastify.log);
  const oauthHandler = createOAuthHandler({
    oauthService,
    baseUrl: config.baseUrl,
  });
  const healthImportHandler = createHealthImportHandler(healthImportService);
  const analysisHandler = createAnalysisHandler(healthAnalysisService);

  // ============================================================================
  // 11. Register Plugins
  // ============================================================================
  await fastify.register(cors);
  await fastify.register(formbody);

  // ============================================================================
  // 12. Register Middleware
  // ============================================================================
  fastify.addHook("preHandler", createMcpOAuthMiddleware(oauthTokensRepo));
  fastify.addHook("preHandler", createAuthMiddleware(config));

  // ============================================================================
  // 13. Register Routes
  // ============================================================================
  registerHealthRoutes(fastify);
  registerMcpRoutes(fastify, mcpTransportHandler);
  registerOAuthRoutes(fastify, oauthHandler, {
    enableCallback: Boolean(config.github.clientId && config.github.clientSecret),
  });
  registerHealthImportRoutes(fastify, healthImportHandler);
  registerAnalysisRoutes(fastify, analysisHandler);

  // ============================================================================
  // 14. Graceful Shutdown Handler
  // ============================================================================
  process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...");

    scheduler.stop();

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
  // 15. Start Scheduler & Server
  // ============================================================================
  if (schedules.length > 0) {
    scheduler.start();
  }

  try {
    await fastify.listen({ port: config.port, host: config.host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

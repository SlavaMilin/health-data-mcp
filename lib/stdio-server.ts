import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { createHealthQueryRepository } from './repositories/health-query.repository.ts';
import { createHealthQueryService } from './services/health-query.service.ts';
import { createMcpToolsHandler } from './handlers/mcp-tools.handler.ts';
import { registerMcpTools } from './routes/mcp-tools.routes.ts';
import { registerMcpResources } from './routes/mcp-resources.routes.ts';
import { createGoalsQueryRepository } from './repositories/goals-query.repository.ts';
import { createGoalsDataRepository } from './repositories/goals-data.repository.ts';
import { createGoalsService } from './services/goals.service.ts';
import { createMcpGoalsHandler } from './handlers/mcp-goals.handler.ts';
import { registerMcpGoalsTools } from './routes/mcp-goals.routes.ts';
import { registerMcpGoalsResources } from './routes/mcp-goals-resources.routes.ts';
import { runMigrations } from './infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from './constants/paths.constants.ts';

const DB_PATH = process.env.HEALTH_DB_PATH;

export interface DatabaseConnections {
  readDb: Database.Database;
  writeDb: Database.Database;
  dbPath: string;
}

export interface StdioServerDeps {
  db?: DatabaseConnections;
}

export const connectDB = async (): Promise<DatabaseConnections> => {
  if (!DB_PATH) {
    throw new Error(
      'HEALTH_DB_PATH environment variable is required. ' +
        'Set it to the path where you want to store the database, e.g. HEALTH_DB_PATH=~/.health-data/health.db',
    );
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const writeDb = new Database(DB_PATH);
  writeDb.pragma('journal_mode = WAL');
  await runMigrations(writeDb, MIGRATIONS_DIR);

  const readDb = new Database(DB_PATH, { readonly: true });

  return { readDb, writeDb, dbPath: DB_PATH };
};

export const setupServer = async (deps?: StdioServerDeps) => {
  const { readDb, writeDb, dbPath } = deps?.db ?? (await connectDB());

  // Health query stack (read-only)
  const healthQueryRepo = createHealthQueryRepository(readDb);
  const healthQueryService = createHealthQueryService(healthQueryRepo);
  const mcpToolsHandler = createMcpToolsHandler(healthQueryService);

  // Goals stack (read + write)
  const goalsQueryRepo = createGoalsQueryRepository(readDb);
  const goalsDataRepo = createGoalsDataRepository(writeDb);
  const goalsService = createGoalsService(goalsQueryRepo, goalsDataRepo);
  const mcpGoalsHandler = createMcpGoalsHandler(goalsService);

  const server = new McpServer(
    { name: 'health-data-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  registerMcpTools(server, mcpToolsHandler);
  registerMcpResources(server, mcpToolsHandler, dbPath);
  registerMcpGoalsTools(server, mcpGoalsHandler);
  registerMcpGoalsResources(server, mcpGoalsHandler);

  return server;
};

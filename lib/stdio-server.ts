import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { createHealthQueryRepository } from './repositories/health-query.repository.ts';
import { createHealthQueryService } from './services/health-query.service.ts';
import { createMcpToolsHandler } from './handlers/mcp-tools.handler.ts';
import { registerMcpTools } from './routes/mcp-tools.routes.ts';
import { registerMcpResources } from './routes/mcp-resources.routes.ts';
import { DEFAULT_DB_PATH } from './constants/paths.constants.ts';

const DB_PATH = process.env.HEALTH_DB_PATH || DEFAULT_DB_PATH;

export interface StdioServerDeps {
  db: Database.Database;
}

export const connectDB = (): Database.Database => {
  if (!existsSync(DB_PATH)) {
    throw new Error(`Database not found at ${DB_PATH}. Please run migration first.`);
  }

  // Enable WAL mode first
  const writeDb = new Database(DB_PATH);
  writeDb.pragma('journal_mode = WAL');
  writeDb.close();

  // Return read-only connection
  return new Database(DB_PATH, { readonly: true });
};

export const setupServer = (deps?: StdioServerDeps) => {
  // ============================================================================
  // 1. Create Database Connection (if not provided)
  // ============================================================================
  const db = deps?.db ?? connectDB();

  // ============================================================================
  // 2. Create Repository
  // ============================================================================
  const healthQueryRepo = createHealthQueryRepository(db);

  // ============================================================================
  // 3. Create Service
  // ============================================================================
  const healthQueryService = createHealthQueryService(healthQueryRepo);

  // ============================================================================
  // 4. Create Handler
  // ============================================================================
  const mcpToolsHandler = createMcpToolsHandler(healthQueryService, healthQueryRepo);

  // ============================================================================
  // 5. Create MCP Server
  // ============================================================================
  const server = new McpServer(
    { name: 'health-data-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  // ============================================================================
  // 6. Register Tools and Resources
  // ============================================================================
  registerMcpTools(server, mcpToolsHandler);
  registerMcpResources(server, mcpToolsHandler, DB_PATH);

  return server;
};

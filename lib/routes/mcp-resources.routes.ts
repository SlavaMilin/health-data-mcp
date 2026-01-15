import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpToolsHandler } from '../handlers/mcp-tools.handler.ts';

export const registerMcpResources = (
  server: McpServer,
  handler: McpToolsHandler,
  dbPath: string,
) => {
  server.registerResource(
    'Health Database',
    'health://database',
    {
      description: 'SQLite database with health metrics and workouts',
      mimeType: 'application/x-sqlite3',
    },
    async () => ({
      contents: [
        {
          uri: 'health://database',
          mimeType: 'text/plain',
          text: `Database located at: ${dbPath}`,
        },
      ],
    }),
  );

  server.registerResource(
    'Database Schema',
    'health://schema',
    {
      description: 'Database schema information with query patterns',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'health://schema',
          mimeType: 'application/json',
          text: JSON.stringify(handler.getSchemaResource(), null, 2),
        },
      ],
    }),
  );
};

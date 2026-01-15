import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpGoalsHandler } from '../handlers/mcp-goals.handler.ts';

const GOALS_RESOURCE_DESCRIPTION = `Active health goals for context.

Each goal has:
- title, description: what user wants to achieve
- deadline: target date (YYYY-MM-DD)
- period: time window for progress (week/month/year)
- metrics[]: targets with { metric_name, target, direction, baseline }
- is_primary: true = main focus goal

To check progress: query_metrics for metric_name, compare to target.`;

export const registerMcpGoalsResources = (server: McpServer, handler: McpGoalsHandler) => {
  server.registerResource(
    'Active Goals',
    'health://goals',
    {
      description: GOALS_RESOURCE_DESCRIPTION,
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'health://goals',
          mimeType: 'application/json',
          text: JSON.stringify(handler.getActiveGoals(), null, 2),
        },
      ],
    }),
  );
};

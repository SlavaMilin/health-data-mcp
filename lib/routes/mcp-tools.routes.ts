import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpToolsHandler } from '../handlers/mcp-tools.handler.ts';
import {
  queryMetricsSchema,
  listMetricTypesSchema,
  listWorkoutTypesSchema,
  executeSqlSchema,
  getAnalysisHistorySchema,
} from '../schemas/mcp-tools.schemas.ts';

export const registerMcpTools = (server: McpServer, handler: McpToolsHandler) => {
  server.registerTool('query_metrics', queryMetricsSchema, async (args) => handler.queryMetrics(args));
  server.registerTool('list_metric_types', listMetricTypesSchema, async () => handler.listMetricTypes());
  server.registerTool('list_workout_types', listWorkoutTypesSchema, async () => handler.listWorkoutTypes());
  server.registerTool('execute_sql', executeSqlSchema, async (args) => handler.executeSQL(args));
  server.registerTool('get_analysis_history', getAnalysisHistorySchema, async (args) => handler.getAnalysisHistory(args));
};

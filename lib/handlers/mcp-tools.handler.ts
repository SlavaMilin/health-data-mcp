import type { HealthQueryService } from '../services/health-query.service.ts';
import type { McpToolResponse, QueryMetricsParams, SchemaInfo, GetAnalysisHistoryParams } from '../types/health-query.types.ts';
import { QUERY_PATTERNS, SCHEMA_USAGE } from '../constants/query-patterns.constants.ts';

export interface SchemaResourceResponse extends SchemaInfo {
  query_patterns: typeof QUERY_PATTERNS;
  how_to_use_schema: typeof SCHEMA_USAGE;
}

export interface McpToolsHandler {
  queryMetrics: (args: QueryMetricsParams) => McpToolResponse;
  listMetricTypes: () => McpToolResponse;
  listWorkoutTypes: () => McpToolResponse;
  executeSQL: (args: { query: string }) => McpToolResponse;
  getSchemaResource: () => SchemaResourceResponse;
  getAnalysisHistory: (args: GetAnalysisHistoryParams) => McpToolResponse;
}

const textResponse = (data: unknown): McpToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});

const errorResponse = (error: string, hint?: string): McpToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify({ error, hint }, null, 2) }],
  isError: true,
});

export const createMcpToolsHandler = (
  healthQueryService: HealthQueryService,
): McpToolsHandler => {
  return {
    queryMetrics: (args) => {
      try {
        const results = healthQueryService.queryMetrics(args);
        return textResponse(results);
      } catch (error) {
        return errorResponse(
          (error as Error).message,
          'Use list_metric_types to see available metrics and their schemas',
        );
      }
    },

    listMetricTypes: () => {
      try {
        const types = healthQueryService.listMetricTypes();
        return textResponse(types);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    listWorkoutTypes: () => {
      try {
        const types = healthQueryService.listWorkoutTypes();
        return textResponse(types);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    executeSQL: (args) => {
      const result = healthQueryService.executeSQL(args.query);
      if (result.error) {
        return errorResponse(
          result.error,
          'Check your SQL syntax. See health://schema resource for table structure and query patterns.',
        );
      }
      return textResponse(result.results);
    },

    getSchemaResource: () => ({
      ...healthQueryService.getSchemaInfo(),
      query_patterns: QUERY_PATTERNS,
      how_to_use_schema: SCHEMA_USAGE,
    }),

    getAnalysisHistory: (args) => {
      try {
        const results = healthQueryService.getAnalysisHistory(args);
        return textResponse(results);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },
  };
};

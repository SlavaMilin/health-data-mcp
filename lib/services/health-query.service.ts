import type { HealthQueryRepository } from '../repositories/health-query.repository.ts';
import type {
  QueryMetricsParams,
  EnrichedMetricType,
  EnrichedWorkoutType,
  SchemaInfo,
} from '../domain/health.ts';
import type { AnalysisRecord, GetAnalysisHistoryParams } from '../domain/analysis.ts';

export interface HealthQueryService {
  queryMetrics: (params: QueryMetricsParams) => unknown[];
  listMetricTypes: () => EnrichedMetricType[];
  listWorkoutTypes: () => EnrichedWorkoutType[];
  executeSQL: (query: string) => { results?: unknown[]; error?: string };
  getSchemaInfo: () => SchemaInfo;
  getAnalysisHistory: (params: GetAnalysisHistoryParams) => AnalysisRecord[];
}

export const createHealthQueryService = (
  healthQueryRepo: HealthQueryRepository,
): HealthQueryService => ({
  queryMetrics: (params) => {
    const { aggregation = 'none' } = params;
    return aggregation !== 'none'
      ? healthQueryRepo.queryMetricsAggregated(params)
      : healthQueryRepo.queryMetricsRaw(params);
  },

  listMetricTypes: () => healthQueryRepo.listMetricTypes(),

  listWorkoutTypes: () => healthQueryRepo.listWorkoutTypes(),

  executeSQL: (query) => {
    try {
      return { results: healthQueryRepo.executeSQL(query) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  getSchemaInfo: () => healthQueryRepo.getSchemaInfo(),

  getAnalysisHistory: (params) => healthQueryRepo.getAnalysisHistory(params),
});

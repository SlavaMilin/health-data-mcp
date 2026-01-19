import type { HealthQueryRepository } from '../repositories/health-query.repository.ts';
import type {
  QueryMetricsParams,
  EnrichedMetricType,
  EnrichedWorkoutType,
  MetricTypeRow,
  WorkoutTypeRow,
  SchemaInfo,
  AnalysisHistoryRow,
  GetAnalysisHistoryParams,
} from '../types/health-query.types.ts';

export interface HealthQueryService {
  queryMetrics: (params: QueryMetricsParams) => unknown[];
  listMetricTypes: () => EnrichedMetricType[];
  listWorkoutTypes: () => EnrichedWorkoutType[];
  executeSQL: (query: string) => { results?: unknown[]; error?: string };
  getSchemaInfo: () => SchemaInfo;
  getAnalysisHistory: (params: GetAnalysisHistoryParams) => AnalysisHistoryRow[];
}

export const createHealthQueryService = (
  healthQueryRepo: HealthQueryRepository,
): HealthQueryService => {
  const enrichMetricType = (type: MetricTypeRow): EnrichedMetricType => {
    const metadata = healthQueryRepo.getMetricMetadata(type.name);
    const exampleRow = healthQueryRepo.getMetricExample(type.name);

    return {
      name: type.name,
      unit: type.unit,
      schema: JSON.parse(type.schema || '[]'),
      count: metadata?.count ?? 0,
      date_range:
        metadata && metadata.count > 0
          ? { min: metadata.min_date, max: metadata.max_date }
          : null,
      example: exampleRow ? JSON.parse(exampleRow.data) : null,
    };
  };

  const enrichWorkoutType = (type: WorkoutTypeRow): EnrichedWorkoutType => {
    const metadata = healthQueryRepo.getWorkoutMetadata(type.name);

    return {
      name: type.name,
      schema: JSON.parse(type.schema || '[]'),
      count: metadata?.count ?? 0,
      date_range:
        metadata && metadata.count > 0
          ? { min: metadata.min_date, max: metadata.max_date }
          : null,
    };
  };

  return {
    queryMetrics: (params) => {
      const { aggregation = 'none' } = params;

      if (aggregation !== 'none') {
        return healthQueryRepo.queryMetricsAggregated(params);
      }
      return healthQueryRepo.queryMetricsRaw(params);
    },

    listMetricTypes: () => {
      const types = healthQueryRepo.getMetricTypes();
      return types.map(enrichMetricType);
    },

    listWorkoutTypes: () => {
      const types = healthQueryRepo.getWorkoutTypes();
      return types.map(enrichWorkoutType);
    },

    executeSQL: (query) => {
      try {
        const results = healthQueryRepo.executeSQL(query);
        return { results };
      } catch (error) {
        return { error: (error as Error).message };
      }
    },

    getSchemaInfo: () => healthQueryRepo.getSchemaInfo(),

    getAnalysisHistory: (params) => healthQueryRepo.getAnalysisHistory(params),
  };
};

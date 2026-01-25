import type {
  QueryMetricsParams,
  EnrichedMetricType,
  EnrichedWorkoutType,
  SchemaInfo,
} from './health.ts';
import type { AnalysisRecord, GetAnalysisHistoryParams } from './analysis.ts';

export interface HealthQueryPort {
  listMetricTypes: () => EnrichedMetricType[];
  listWorkoutTypes: () => EnrichedWorkoutType[];
  queryMetricsRaw: (params: QueryMetricsParams) => unknown[];
  queryMetricsAggregated: (params: QueryMetricsParams) => unknown[];
  executeSQL: (query: string) => unknown[];
  getSchemaInfo: () => SchemaInfo;
  getAnalysisHistory: (params: GetAnalysisHistoryParams) => AnalysisRecord[];
}

export interface HealthDataPort {
  insertMetricType: (name: string, unit: string, schema: string | null) => void;
  updateMetricTypeSchema: (name: string, schema: string) => void;
  getMetricTypeId: (name: string) => number;
  insertHealthMetric: (typeId: number, date: string, data: string) => void;
  insertWorkoutType: (name: string, schema: string | null) => void;
  updateWorkoutTypeSchema: (name: string, schema: string) => void;
  getWorkoutTypeId: (name: string) => number;
  insertWorkout: (typeId: number, startDate: string, endDate: string, data: string) => void;
  transaction: <T>(fn: () => T) => T;
}

export interface QueryMetricsParams {
  metric_name?: string;
  start_date?: string;
  end_date?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
  limit?: number;
}

export interface EnrichedMetricType {
  name: string;
  unit: string;
  schema: string[];
  count: number;
  date_range: { min: string | null; max: string | null } | null;
  example: unknown | null;
}

export interface EnrichedWorkoutType {
  name: string;
  schema: string[];
  count: number;
  date_range: { min: string | null; max: string | null } | null;
}

export interface SchemaInfo {
  tables: Array<{ name: string; sql: string }>;
  views: Array<{ name: string; sql: string }>;
}

export interface HealthImportResult {
  metrics: number;
  workouts: number;
}

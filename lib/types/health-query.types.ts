// Query parameters
export interface QueryMetricsParams {
  metric_name?: string;
  start_date?: string;
  end_date?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
  limit?: number;
}

// Database row types
export interface MetricTypeRow {
  name: string;
  unit: string;
  schema: string | null;
}

export interface MetricMetadataRow {
  count: number;
  min_date: string | null;
  max_date: string | null;
}

export interface MetricExampleRow {
  data: string;
}

export interface WorkoutTypeRow {
  name: string;
  schema: string | null;
}

export interface WorkoutMetadataRow {
  count: number;
  min_date: string | null;
  max_date: string | null;
}

// Enriched types (service output)
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

// Schema info for resources
export interface SchemaInfo {
  tables: Array<{ name: string; sql: string }>;
  views: Array<{ name: string; sql: string }>;
}

// Analysis types
export type AnalysisType = 'daily' | 'weekly' | 'monthly';

export interface AnalysisHistoryRow {
  id: number;
  date: string;
  type: AnalysisType;
  analysis: string;
  created_at: string;
}

export interface GetAnalysisHistoryParams {
  type?: AnalysisType;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

// MCP response types
export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResponse {
  [key: string]: unknown;
  content: McpTextContent[];
  isError?: boolean;
}

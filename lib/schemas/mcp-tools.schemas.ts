import { z } from 'zod';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD')
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date value');

export const queryMetricsSchema = {
  title: 'Query Health Metrics',
  description: `Query health metrics from Apple Health.

QUICK START:
1. Use list_metric_types to see available metrics with examples
2. Query by metric_name with optional date filters (YYYY-MM-DD)
3. Use aggregation (sum, avg, min, max, count) or get raw data
4. For advanced queries, use execute_sql

See health://schema resource for detailed query patterns and examples.`,
  inputSchema: z.object({
    metric_name: z
      .string()
      .optional()
      .describe(
        'Name of the metric (e.g., step_count, sleep_analysis, heart_rate). Use list_metric_types to see all available metrics.',
      ),
    start_date: dateSchema
      .optional()
      .describe(
        'Start date filter (YYYY-MM-DD format). Filters using SUBSTR(date, 1, 10) >= start_date. Dates in DB format: "2026-01-01 00:00:00 +0500".',
      ),
    end_date: dateSchema
      .optional()
      .describe(
        'End date filter (YYYY-MM-DD format). Filters using SUBSTR(date, 1, 10) <= end_date. Includes the entire end_date day.',
      ),
    aggregation: z
      .enum(['sum', 'avg', 'min', 'max', 'count', 'none'])
      .default('none')
      .describe(
        "Aggregation function to apply. Uses 'qty' field for most metrics, 'total_sleep' for sleep_analysis. For custom aggregation of JSON fields from schema, use execute_sql.",
      ),
    limit: z
      .number()
      .min(1)
      .max(10000)
      .default(100)
      .describe('Maximum number of results to return (1-10000)'),
  }),
};

export const listMetricTypesSchema = {
  title: 'List Metric Types',
  description: `List all available health metrics with schema, examples, count, and date range.

Returns: name, unit, schema (array), count, date_range, example.

Use this first to discover available metrics before querying.`,
  inputSchema: z.object({}),
};

export const listWorkoutTypesSchema = {
  title: 'List Workout Types',
  description: `List all available workout types with schema, count, and date range.

Returns: name, schema (array), count, date_range.

WARNING: Workout data is VERY HEAVY (30KB+ per workout with detailed heart rate, step count, etc.).
DO NOT query raw workout data. Instead, use execute_sql with aggregations:
- Count workouts: SELECT COUNT(*) FROM workouts_with_types WHERE ...
- Get specific fields: SELECT workout_name, start_date, JSON_EXTRACT(data, '$.duration') FROM ...
- Aggregate data: SELECT workout_name, COUNT(*), AVG(JSON_EXTRACT(data, '$.duration')) FROM ...

Use this first to discover available workout types and their schemas.`,
  inputSchema: z.object({}),
};

export const executeSqlSchema = {
  title: 'Execute SQL',
  description: `Execute raw SQL queries for advanced analytics and aggregations.

MAIN TABLES:
- metrics_with_types (pre-joined, has qty, value, total_sleep)
- workouts_with_types (pre-joined, has duration, calories_burned)

COMMON PATTERNS:
- Extract JSON: JSON_EXTRACT(data, '$.fieldName')
- Filter dates: WHERE SUBSTR(date, 1, 10) >= '2025-01-01'
- Group by day/week/month: Use strftime() and SUBSTR()
- Relative dates: date('now', '-30 days')

See health://schema resource for complete query patterns, examples, and table schemas.`,
  inputSchema: z.object({
    query: z.string().describe('SQL query to execute'),
  }),
};

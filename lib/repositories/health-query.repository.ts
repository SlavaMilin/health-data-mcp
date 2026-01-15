import type Database from 'better-sqlite3';
import type {
  MetricTypeRow,
  MetricMetadataRow,
  MetricExampleRow,
  WorkoutTypeRow,
  WorkoutMetadataRow,
  QueryMetricsParams,
  SchemaInfo,
} from '../types/health-query.types.ts';

export interface HealthQueryRepository {
  getMetricTypes: () => MetricTypeRow[];
  getMetricMetadata: (name: string) => MetricMetadataRow | undefined;
  getMetricExample: (name: string) => MetricExampleRow | undefined;
  getWorkoutTypes: () => WorkoutTypeRow[];
  getWorkoutMetadata: (name: string) => WorkoutMetadataRow | undefined;
  queryMetricsRaw: (params: QueryMetricsParams) => unknown[];
  queryMetricsAggregated: (params: QueryMetricsParams) => unknown[];
  executeSQL: (query: string) => unknown[];
  getSchemaInfo: () => SchemaInfo;
}

export const createHealthQueryRepository = (db: Database.Database): HealthQueryRepository => {
  const getMetricTypesStmt = db.prepare<[], MetricTypeRow>(
    'SELECT name, unit, schema FROM metric_types ORDER BY name',
  );

  const getMetricMetadataStmt = db.prepare<[string], MetricMetadataRow>(`
    SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date
    FROM health_metrics hm
    JOIN metric_types mt ON hm.type_id = mt.id
    WHERE mt.name = ?
  `);

  const getMetricExampleStmt = db.prepare<[string], MetricExampleRow>(`
    SELECT data FROM health_metrics hm
    JOIN metric_types mt ON hm.type_id = mt.id
    WHERE mt.name = ? LIMIT 1
  `);

  const getWorkoutTypesStmt = db.prepare<[], WorkoutTypeRow>(
    'SELECT name, schema FROM workout_types ORDER BY name',
  );

  const getWorkoutMetadataStmt = db.prepare<[string], WorkoutMetadataRow>(`
    SELECT COUNT(*) as count, MIN(start_date) as min_date, MAX(start_date) as max_date
    FROM workouts w
    JOIN workout_types wt ON w.type_id = wt.id
    WHERE wt.name = ?
  `);

  return {
    getMetricTypes: () => getMetricTypesStmt.all(),

    getMetricMetadata: (name) => getMetricMetadataStmt.get(name),

    getMetricExample: (name) => getMetricExampleStmt.get(name),

    getWorkoutTypes: () => getWorkoutTypesStmt.all(),

    getWorkoutMetadata: (name) => getWorkoutMetadataStmt.get(name),

    queryMetricsRaw: (params) => {
      const { metric_name, start_date, end_date, limit = 100 } = params;
      let query = 'SELECT * FROM metrics_with_types WHERE 1=1';
      const queryParams: (string | number)[] = [];

      if (metric_name) {
        query += ' AND metric_name = ?';
        queryParams.push(metric_name);
      }
      if (start_date) {
        query += ' AND SUBSTR(date, 1, 10) >= ?';
        queryParams.push(start_date);
      }
      if (end_date) {
        query += ' AND SUBSTR(date, 1, 10) <= ?';
        queryParams.push(end_date);
      }
      query += ' ORDER BY date DESC LIMIT ?';
      queryParams.push(limit);

      return db.prepare(query).all(...queryParams);
    },

    queryMetricsAggregated: (params) => {
      const { metric_name, start_date, end_date, aggregation = 'sum' } = params;
      const aggFunc = aggregation.toUpperCase();
      const valueField = metric_name === 'sleep_analysis' ? 'total_sleep' : 'qty';

      let query = `SELECT metric_name, unit,
        ${aggFunc}(${valueField}) as ${aggregation}_value,
        COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date
        FROM metrics_with_types WHERE 1=1`;
      const queryParams: (string | number)[] = [];

      if (metric_name) {
        query += ' AND metric_name = ?';
        queryParams.push(metric_name);
      }
      if (start_date) {
        query += ' AND SUBSTR(date, 1, 10) >= ?';
        queryParams.push(start_date);
      }
      if (end_date) {
        query += ' AND SUBSTR(date, 1, 10) <= ?';
        queryParams.push(end_date);
      }
      query += ' GROUP BY metric_name, unit';

      return db.prepare(query).all(...queryParams);
    },

    executeSQL: (query) => db.prepare(query).all(),

    getSchemaInfo: () => {
      const tables = db
        .prepare(
          `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
        )
        .all() as Array<{ name: string; sql: string }>;

      const views = db
        .prepare(`SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name`)
        .all() as Array<{ name: string; sql: string }>;

      return { tables, views };
    },
  };
};

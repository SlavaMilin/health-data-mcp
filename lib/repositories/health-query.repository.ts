import type Database from 'better-sqlite3';
import type {
  QueryMetricsParams,
  SchemaInfo,
  EnrichedMetricType,
  EnrichedWorkoutType,
} from '../domain/health.ts';
import type { AnalysisRecord, GetAnalysisHistoryParams } from '../domain/analysis.ts';
import type { HealthQueryPort } from '../domain/health.port.ts';

interface MetricTypeRow {
  name: string;
  unit: string;
  schema: string | null;
}

interface MetricMetadataRow {
  count: number;
  min_date: string | null;
  max_date: string | null;
}

interface MetricExampleRow {
  data: string;
}

interface WorkoutTypeRow {
  name: string;
  schema: string | null;
}

interface WorkoutMetadataRow {
  count: number;
  min_date: string | null;
  max_date: string | null;
}

interface AnalysisHistoryRow {
  id: number;
  date: string;
  type: string;
  analysis: string;
  created_at: string;
}

export const createHealthQueryRepository = (db: Database.Database): HealthQueryPort => {
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

  const enrichMetricType = (type: MetricTypeRow): EnrichedMetricType => {
    const metadata = getMetricMetadataStmt.get(type.name);
    const exampleRow = getMetricExampleStmt.get(type.name);

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
    const metadata = getWorkoutMetadataStmt.get(type.name);

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

  const rowToAnalysisRecord = (row: AnalysisHistoryRow): AnalysisRecord => ({
    id: row.id,
    date: row.date,
    type: row.type as AnalysisRecord['type'],
    analysis: row.analysis,
    created_at: row.created_at,
  });

  return {
    listMetricTypes: () => getMetricTypesStmt.all().map(enrichMetricType),

    listWorkoutTypes: () => getWorkoutTypesStmt.all().map(enrichWorkoutType),

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

    getAnalysisHistory: (params) => {
      const { type, start_date, end_date, limit = 10 } = params;
      let query = 'SELECT id, date, type, analysis, created_at FROM analysis_history WHERE 1=1';
      const queryParams: (string | number)[] = [];

      if (type) {
        query += ' AND type = ?';
        queryParams.push(type);
      }
      if (start_date) {
        query += ' AND date >= ?';
        queryParams.push(start_date);
      }
      if (end_date) {
        query += ' AND date <= ?';
        queryParams.push(end_date);
      }
      query += ' ORDER BY date DESC LIMIT ?';
      queryParams.push(limit);

      const rows = db.prepare(query).all(...queryParams) as AnalysisHistoryRow[];
      return rows.map(rowToAnalysisRecord);
    },
  };
};

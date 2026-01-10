import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.HEALTH_DB_PATH || join(__dirname, '..', 'data', 'health_data.db');

const QUERY_PATTERNS = {
  extract_json_field: {
    description: 'Extract fields from JSON data using field names from schema',
    metrics: 'SELECT JSON_EXTRACT(data, \'$.fieldName\') as field_value FROM metrics_with_types WHERE metric_name = ?',
    workouts: 'SELECT JSON_EXTRACT(data, \'$.fieldName\') as field_value FROM workouts_with_types WHERE workout_name = ?',
    note: 'Replace fieldName with actual field name from schema array'
  },
  filter_by_date: {
    description: 'Filter by date (dates stored as "YYYY-MM-DD HH:MM:SS +TZ")',
    pattern: 'WHERE SUBSTR(date, 1, 10) >= ? AND SUBSTR(date, 1, 10) <= ?',
    example: 'WHERE SUBSTR(date, 1, 10) >= \'2025-12-26\' AND SUBSTR(date, 1, 10) <= \'2026-01-01\'',
    note: 'SUBSTR(date, 1, 10) extracts YYYY-MM-DD portion for day-level comparison'
  },
  relative_dates: {
    description: 'Use SQLite date functions for relative date filtering',
    examples: {
      last_30_days: 'WHERE SUBSTR(date, 1, 10) >= date(\'now\', \'-30 days\')',
      current_month: 'WHERE SUBSTR(date, 1, 10) >= date(\'now\', \'start of month\')',
      last_month: 'WHERE SUBSTR(date, 1, 10) >= date(\'now\', \'start of month\', \'-1 month\') AND SUBSTR(date, 1, 10) < date(\'now\', \'start of month\')',
      last_7_days: 'WHERE SUBSTR(date, 1, 10) >= date(\'now\', \'-7 days\')'
    },
    note: 'Use date() function for dynamic date calculations. Works with both metrics (date) and workouts (start_date)'
  },
  group_by_day: {
    description: 'Group results by day',
    metrics: 'SELECT SUBSTR(date, 1, 10) as day, AVG(qty) as avg_value FROM metrics_with_types WHERE metric_name = ? GROUP BY SUBSTR(date, 1, 10)',
    workouts: 'SELECT SUBSTR(start_date, 1, 10) as day, COUNT(*) as count FROM workouts_with_types WHERE workout_name = ? GROUP BY SUBSTR(start_date, 1, 10)',
    note: 'Use SUBSTR(date, 1, 10) to extract date portion for grouping'
  },
  filter_by_json_field: {
    description: 'Filter by JSON field value',
    pattern: 'WHERE JSON_EXTRACT(data, \'$.fieldName\') LIKE ?',
    note: 'Use field names from schema array'
  },
  access_nested_json: {
    description: 'Access nested JSON fields',
    pattern: 'JSON_EXTRACT(data, \'$.nested.field\')',
    note: 'Use if schema shows nested structure'
  },
  check_units: {
    description: 'Check units of measurement',
    note: 'Units may vary depending on export settings. Always verify units:',
    methods: [
      'For metrics: Use list_metric_types to get unit field',
      'For workouts: Check JSON data field or schema for unit information',
      'Example: SELECT unit FROM metric_types WHERE name = \'step_count\'',
      'Example: SELECT JSON_EXTRACT(data, \'$.activeEnergyBurned.units\') FROM workouts_with_types LIMIT 1'
    ]
  }
};

const SCHEMA_USAGE = {
  description: 'Schema field contains JSON array of field names',
  example: 'Schema: ["date", "qty", "source"] means you can use JSON_EXTRACT(data, \'$.date\'), JSON_EXTRACT(data, \'$.qty\'), JSON_EXTRACT(data, \'$.source\')',
  workflow: {
    step1: 'Get schema from list_metric_types or list_workout_types',
    step2: 'Parse schema as JSON array: ["field1", "field2", ...]',
    step3: 'Use field names with JSON_EXTRACT(data, \'$.fieldName\')',
    step4: 'Field names in schema match exactly the keys in JSON data'
  }
};

let db: Database.Database | null = null;

export const connectDB = async () => {
  if (!existsSync(DB_PATH)) {
    throw new Error(`Database not found at ${DB_PATH}. Please run migration first.`);
  }
  const writeDb = new Database(DB_PATH);
  writeDb.pragma('journal_mode = WAL');
  writeDb.close();

  db = new Database(DB_PATH, { readonly: true });
};

const textResponse = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
});

const errorResponse = (error: Error, hint?: string) => ({
  ...textResponse({ error: error.message, hint }),
  isError: true
});

interface QueryMetricsArgs {
  metric_name?: string;
  start_date?: string;
  end_date?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
  limit?: number;
}

const queryMetrics = async (args?: QueryMetricsArgs) => {
  try {
    if (!db) throw new Error('Database not connected');
    const { metric_name, start_date, end_date, aggregation = 'none', limit = 100 } = args || {};

    if (aggregation !== 'none') {
      const aggFunc = aggregation.toUpperCase();
      const valueField = metric_name === 'sleep_analysis' ? 'total_sleep' : 'qty';
      let query = `SELECT
        metric_name,
        unit,
        ${aggFunc}(${valueField}) as ${aggregation}_value,
        COUNT(*) as count,
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM metrics_with_types WHERE 1=1`;
      const params: (string | number)[] = [];

      if (metric_name) {
        query += ' AND metric_name = ?';
        params.push(metric_name);
      }
      if (start_date) {
        query += ' AND SUBSTR(date, 1, 10) >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND SUBSTR(date, 1, 10) <= ?';
        params.push(end_date);
      }
      query += ' GROUP BY metric_name, unit';

      return textResponse(db.prepare(query).all(...params));
    }

    let query = 'SELECT * FROM metrics_with_types WHERE 1=1';
    const params: (string | number)[] = [];

    if (metric_name) {
      query += ' AND metric_name = ?';
      params.push(metric_name);
    }
    if (start_date) {
      query += ' AND SUBSTR(date, 1, 10) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND SUBSTR(date, 1, 10) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY date DESC LIMIT ?';
    params.push(limit);

    return textResponse(db.prepare(query).all(...params));
  } catch (error) {
    return errorResponse(error as Error, 'Use list_metric_types to see available metrics and their schemas');
  }
};


interface MetricTypeBasic {
  name: string;
  unit: string;
  schema: string | null;
}

interface MetricMetadata {
  count: number;
  min_date: string | null;
  max_date: string | null;
}

interface MetricExample {
  data: string;
}

const enrichMetricType = (database: Database.Database, type: MetricTypeBasic) => {
  const metadata = database.prepare<[string], MetricMetadata>(`
    SELECT
      COUNT(*) as count,
      MIN(date) as min_date,
      MAX(date) as max_date
    FROM health_metrics hm
    JOIN metric_types mt ON hm.type_id = mt.id
    WHERE mt.name = ?
  `).get(type.name);

  const exampleRow = database.prepare<[string], MetricExample>(`
    SELECT data
    FROM health_metrics hm
    JOIN metric_types mt ON hm.type_id = mt.id
    WHERE mt.name = ?
    LIMIT 1
  `).get(type.name);

  return {
    name: type.name,
    unit: type.unit,
    schema: JSON.parse(type.schema || '[]'),
    count: metadata?.count ?? 0,
    date_range: metadata && metadata.count > 0 ? {
      min: metadata.min_date,
      max: metadata.max_date
    } : null,
    example: exampleRow ? JSON.parse(exampleRow.data) : null
  };
};

const listMetricTypes = async () => {
  try {
    if (!db) throw new Error('Database not connected');
    const database = db;

    const types = database.prepare<[], MetricTypeBasic>('SELECT name, unit, schema FROM metric_types ORDER BY name').all();
    const enrichedTypes = types.map(type => enrichMetricType(database, type));

    return textResponse(enrichedTypes);
  } catch (error) {
    return errorResponse(error as Error);
  }
};

interface WorkoutTypeBasic {
  name: string;
  schema: string | null;
}

interface WorkoutMetadata {
  count: number;
  min_date: string | null;
  max_date: string | null;
}

const enrichWorkoutType = (database: Database.Database, type: WorkoutTypeBasic) => {
  const metadata = database.prepare<[string], WorkoutMetadata>(`
    SELECT
      COUNT(*) as count,
      MIN(start_date) as min_date,
      MAX(start_date) as max_date
    FROM workouts w
    JOIN workout_types wt ON w.type_id = wt.id
    WHERE wt.name = ?
  `).get(type.name);

  return {
    name: type.name,
    schema: JSON.parse(type.schema || '[]'),
    count: metadata?.count ?? 0,
    date_range: metadata && metadata.count > 0 ? {
      min: metadata.min_date,
      max: metadata.max_date
    } : null
  };
};

const listWorkoutTypes = async () => {
  try {
    if (!db) throw new Error('Database not connected');
    const database = db;

    const types = database.prepare<[], WorkoutTypeBasic>('SELECT name, schema FROM workout_types ORDER BY name').all();
    const enrichedTypes = types.map(type => enrichWorkoutType(database, type));

    return textResponse(enrichedTypes);
  } catch (error) {
    return errorResponse(error as Error);
  }
};

const executeSQL = async (query: string) => {
  try {
    if (!db) throw new Error('Database not connected');
    const results = db.prepare(query).all();
    return textResponse(results);
  } catch (error) {
    return errorResponse(error as Error, 'Check your SQL syntax. See health://schema resource for table structure and query patterns.');
  }
};

const registerResources = (server: McpServer) => {
  server.registerResource(
    'Health Database',
    'health://database',
    {
      description: 'SQLite database with health metrics and workouts',
      mimeType: 'application/x-sqlite3',
    },
    async () => ({
      contents: [{
        uri: 'health://database',
        mimeType: 'text/plain',
        text: `Database located at: ${DB_PATH}`,
      }],
    })
  );

  server.registerResource(
    'Database Schema',
    'health://schema',
    {
      description: 'Database schema information with query patterns',
      mimeType: 'application/json',
    },
    async () => {
      if (!db) await connectDB();
      if (!db) throw new Error('Database not connected');

      const tables = db.prepare(
        `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      ).all();
      const views = db.prepare(
        `SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name`
      ).all();

      return {
        contents: [{
          uri: 'health://schema',
          mimeType: 'application/json',
          text: JSON.stringify({
            tables,
            views,
            query_patterns: QUERY_PATTERNS,
            how_to_use_schema: SCHEMA_USAGE
          }, null, 2),
        }],
      };
    }
  );
};

const registerTools = (server: McpServer) => {
  server.registerTool(
    'query_metrics',
    {
      title: 'Query Health Metrics',
      description: 'Query health metrics from Apple Health.\n\nQUICK START:\n1. Use list_metric_types to see available metrics with examples\n2. Query by metric_name with optional date filters (YYYY-MM-DD)\n3. Use aggregation (sum, avg, min, max, count) or get raw data\n4. For advanced queries, use execute_sql\n\nSee health://schema resource for detailed query patterns and examples.',
      inputSchema: z.object({
        metric_name: z.string().optional().describe('Name of the metric (e.g., step_count, sleep_analysis, heart_rate). Use list_metric_types to see all available metrics.'),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD').refine((date) => !isNaN(Date.parse(date)), 'Invalid date value').optional().describe('Start date filter (YYYY-MM-DD format). Filters using SUBSTR(date, 1, 10) >= start_date. Dates in DB format: "2026-01-01 00:00:00 +0500".'),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD').refine((date) => !isNaN(Date.parse(date)), 'Invalid date value').optional().describe('End date filter (YYYY-MM-DD format). Filters using SUBSTR(date, 1, 10) <= end_date. Includes the entire end_date day.'),
        aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count', 'none']).default('none').describe('Aggregation function to apply. Uses \'qty\' field for most metrics, \'total_sleep\' for sleep_analysis. For custom aggregation of JSON fields from schema, use execute_sql.'),
        limit: z.number().min(1).max(10000).default(100).describe('Maximum number of results to return (1-10000)'),
      }),
    },
    async (args) => {
      if (!db) await connectDB();
      return await queryMetrics(args);
    }
  );


  server.registerTool(
    'list_metric_types',
    {
      title: 'List Metric Types',
      description: 'List all available health metrics with schema, examples, count, and date range.\n\nReturns: name, unit, schema (array), count, date_range, example.\n\nUse this first to discover available metrics before querying.',
      inputSchema: z.object({}),
    },
    async () => {
      if (!db) await connectDB();
      return await listMetricTypes();
    }
  );

  server.registerTool(
    'list_workout_types',
    {
      title: 'List Workout Types',
      description: 'List all available workout types with schema, count, and date range.\n\nReturns: name, schema (array), count, date_range.\n\n⚠️ WARNING: Workout data is VERY HEAVY (30KB+ per workout with detailed heart rate, step count, etc.).\nDO NOT query raw workout data. Instead, use execute_sql with aggregations:\n- Count workouts: SELECT COUNT(*) FROM workouts_with_types WHERE ...\n- Get specific fields: SELECT workout_name, start_date, JSON_EXTRACT(data, \'$.duration\') FROM ...\n- Aggregate data: SELECT workout_name, COUNT(*), AVG(JSON_EXTRACT(data, \'$.duration\')) FROM ...\n\nUse this first to discover available workout types and their schemas.',
      inputSchema: z.object({}),
    },
    async () => {
      if (!db) await connectDB();
      return await listWorkoutTypes();
    }
  );

  server.registerTool(
    'execute_sql',
    {
      title: 'Execute SQL',
      description: 'Execute raw SQL queries for advanced analytics and aggregations.\n\nMAIN TABLES:\n- metrics_with_types (pre-joined, has qty, value, total_sleep)\n- workouts_with_types (pre-joined, has duration, calories_burned)\n\nCOMMON PATTERNS:\n- Extract JSON: JSON_EXTRACT(data, \'$.fieldName\')\n- Filter dates: WHERE SUBSTR(date, 1, 10) >= \'2025-01-01\'\n- Group by day/week/month: Use strftime() and SUBSTR()\n- Relative dates: date(\'now\', \'-30 days\')\n\nSee health://schema resource for complete query patterns, examples, and table schemas.',
      inputSchema: z.object({
        query: z.string().describe('SQL query to execute'),
      }),
    },
    async (args) => {
      if (!db) await connectDB();
      return await executeSQL(args.query);
    }
  );
};

export const setupServer = () => {
  const server = new McpServer(
    { name: 'health-data-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  registerResources(server);
  registerTools(server);

  return server;
};

export const QUERY_PATTERNS = {
  extract_json_field: {
    description: 'Extract fields from JSON data using field names from schema',
    metrics:
      "SELECT JSON_EXTRACT(data, '$.fieldName') as field_value FROM metrics_with_types WHERE metric_name = ?",
    workouts:
      "SELECT JSON_EXTRACT(data, '$.fieldName') as field_value FROM workouts_with_types WHERE workout_name = ?",
    note: 'Replace fieldName with actual field name from schema array',
  },
  filter_by_date: {
    description: 'Filter by date (dates stored as "YYYY-MM-DD HH:MM:SS +TZ")',
    pattern: 'WHERE SUBSTR(date, 1, 10) >= ? AND SUBSTR(date, 1, 10) <= ?',
    example:
      "WHERE SUBSTR(date, 1, 10) >= '2025-12-26' AND SUBSTR(date, 1, 10) <= '2026-01-01'",
    note: 'SUBSTR(date, 1, 10) extracts YYYY-MM-DD portion for day-level comparison',
  },
  relative_dates: {
    description: 'Use SQLite date functions for relative date filtering',
    examples: {
      last_30_days: "WHERE SUBSTR(date, 1, 10) >= date('now', '-30 days')",
      current_month: "WHERE SUBSTR(date, 1, 10) >= date('now', 'start of month')",
      last_month:
        "WHERE SUBSTR(date, 1, 10) >= date('now', 'start of month', '-1 month') AND SUBSTR(date, 1, 10) < date('now', 'start of month')",
      last_7_days: "WHERE SUBSTR(date, 1, 10) >= date('now', '-7 days')",
    },
    note: "Use date() function for dynamic date calculations. Works with both metrics (date) and workouts (start_date)",
  },
  group_by_day: {
    description: 'Group results by day',
    metrics:
      'SELECT SUBSTR(date, 1, 10) as day, AVG(qty) as avg_value FROM metrics_with_types WHERE metric_name = ? GROUP BY SUBSTR(date, 1, 10)',
    workouts:
      'SELECT SUBSTR(start_date, 1, 10) as day, COUNT(*) as count FROM workouts_with_types WHERE workout_name = ? GROUP BY SUBSTR(start_date, 1, 10)',
    note: 'Use SUBSTR(date, 1, 10) to extract date portion for grouping',
  },
  filter_by_json_field: {
    description: 'Filter by JSON field value',
    pattern: "WHERE JSON_EXTRACT(data, '$.fieldName') LIKE ?",
    note: 'Use field names from schema array',
  },
  access_nested_json: {
    description: 'Access nested JSON fields',
    pattern: "JSON_EXTRACT(data, '$.nested.field')",
    note: 'Use if schema shows nested structure',
  },
  check_units: {
    description: 'Check units of measurement',
    note: 'Units may vary depending on export settings. Always verify units:',
    methods: [
      'For metrics: Use list_metric_types to get unit field',
      'For workouts: Check JSON data field or schema for unit information',
      "Example: SELECT unit FROM metric_types WHERE name = 'step_count'",
      "Example: SELECT JSON_EXTRACT(data, '$.activeEnergyBurned.units') FROM workouts_with_types LIMIT 1",
    ],
  },
} as const;

export const SCHEMA_USAGE = {
  description: 'Schema field contains JSON array of field names',
  example:
    "Schema: [\"date\", \"qty\", \"source\"] means you can use JSON_EXTRACT(data, '$.date'), JSON_EXTRACT(data, '$.qty'), JSON_EXTRACT(data, '$.source')",
  workflow: {
    step1: 'Get schema from list_metric_types or list_workout_types',
    step2: 'Parse schema as JSON array: ["field1", "field2", ...]',
    step3: "Use field names with JSON_EXTRACT(data, '$.fieldName')",
    step4: 'Field names in schema match exactly the keys in JSON data',
  },
} as const;

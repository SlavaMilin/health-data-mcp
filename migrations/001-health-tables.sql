--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

-- Tables
CREATE TABLE IF NOT EXISTS metric_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  unit TEXT,
  schema TEXT
);

CREATE TABLE IF NOT EXISTS health_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER,
  date TEXT,
  data TEXT,
  UNIQUE(type_id, data)
);

CREATE TABLE IF NOT EXISTS workout_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  schema TEXT
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER,
  start_date TEXT,
  end_date TEXT,
  data TEXT,
  UNIQUE(type_id, start_date, end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metrics_date ON health_metrics (date);
CREATE INDEX IF NOT EXISTS idx_metrics_type_date ON health_metrics (type_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts (start_date);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts (type_id);
CREATE INDEX IF NOT EXISTS idx_workouts_type_date ON workouts (type_id, start_date);

-- Views
CREATE VIEW IF NOT EXISTS metrics_with_types AS
SELECT
  hm.id,
  hm.type_id,
  mt.name as metric_name,
  mt.unit,
  mt.schema,
  hm.date,
  hm.data,
  JSON_EXTRACT(hm.data, '$.qty') as qty,
  JSON_EXTRACT(hm.data, '$.value') as value,
  JSON_EXTRACT(hm.data, '$.totalSleep') as total_sleep
FROM health_metrics hm
JOIN metric_types mt ON hm.type_id = mt.id;

CREATE VIEW IF NOT EXISTS workouts_with_types AS
SELECT
  w.id,
  w.type_id,
  wt.name as workout_name,
  wt.schema,
  w.start_date,
  w.end_date,
  w.data,
  JSON_EXTRACT(w.data, '$.duration') as duration,
  JSON_EXTRACT(w.data, '$.activeEnergyBurned.qty') as calories_burned
FROM workouts w
JOIN workout_types wt ON w.type_id = wt.id;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP VIEW IF EXISTS workouts_with_types;
DROP VIEW IF EXISTS metrics_with_types;

DROP INDEX IF EXISTS idx_workouts_type_date;
DROP INDEX IF EXISTS idx_workouts_type;
DROP INDEX IF EXISTS idx_workouts_date;
DROP INDEX IF EXISTS idx_metrics_type_date;
DROP INDEX IF EXISTS idx_metrics_date;

DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS workout_types;
DROP TABLE IF EXISTS health_metrics;
DROP TABLE IF EXISTS metric_types;

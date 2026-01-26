--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  meal_type TEXT NOT NULL DEFAULT 'other'
    CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  meal_name TEXT NOT NULL,
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_meal_logs_date;
DROP TABLE IF EXISTS meal_logs;

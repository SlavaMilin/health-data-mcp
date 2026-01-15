--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  deadline TEXT,
  period TEXT CHECK(period IN ('week', 'month', 'year') OR period IS NULL),
  metrics TEXT,  -- JSON: [{ metric_name, target, direction, baseline }, ...]
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
  is_primary INTEGER DEFAULT 0 CHECK(is_primary IN (0, 1)),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_status ON goals (status);
CREATE INDEX IF NOT EXISTS idx_goals_primary ON goals (is_primary) WHERE is_primary = 1;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_goals_primary;
DROP INDEX IF EXISTS idx_goals_status;
DROP TABLE IF EXISTS goals;

--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analysis_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,              -- Period end date (YYYY-MM-DD)
  type TEXT DEFAULT 'weekly',      -- Analysis type: daily, weekly, monthly
  analysis TEXT NOT NULL,          -- AI-generated analysis text
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, type)
);

CREATE INDEX IF NOT EXISTS idx_analysis_history_date ON analysis_history(date);
CREATE INDEX IF NOT EXISTS idx_analysis_history_type ON analysis_history(type);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_analysis_history_type;
DROP INDEX IF EXISTS idx_analysis_history_date;
DROP TABLE IF EXISTS analysis_history;

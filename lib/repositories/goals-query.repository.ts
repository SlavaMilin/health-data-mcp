import type Database from 'better-sqlite3';
import type { Goal, GoalStatus, GoalPeriod } from '../domain/goals.ts';

interface GoalRow {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  period: string | null;
  metrics: string | null;
  status: string;
  is_primary: number;
  created_at: string;
  updated_at: string;
}

const rowToGoal = (row: GoalRow): Goal => ({
  id: row.id,
  title: row.title,
  description: row.description,
  deadline: row.deadline,
  period: row.period as GoalPeriod | null,
  status: row.status as GoalStatus,
  is_primary: row.is_primary === 1,
  metrics: row.metrics ? JSON.parse(row.metrics) : [],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export interface GoalsQueryRepository {
  getById: (id: number) => Goal | undefined;
  list: (status?: GoalStatus | 'all') => Goal[];
  getPrimary: () => Goal | undefined;
}

export const createGoalsQueryRepository = (db: Database.Database): GoalsQueryRepository => {
  const getByIdStmt = db.prepare<[number], GoalRow>('SELECT * FROM goals WHERE id = ?');

  const listByStatusStmt = db.prepare<[string], GoalRow>(
    'SELECT * FROM goals WHERE status = ? ORDER BY is_primary DESC, created_at DESC',
  );

  const listAllStmt = db.prepare<[], GoalRow>(
    'SELECT * FROM goals ORDER BY is_primary DESC, created_at DESC',
  );

  const getPrimaryStmt = db.prepare<[], GoalRow>(
    "SELECT * FROM goals WHERE is_primary = 1 AND status = 'active' LIMIT 1",
  );

  return {
    getById: (id) => {
      const row = getByIdStmt.get(id);
      return row ? rowToGoal(row) : undefined;
    },

    list: (status) => {
      const rows = !status || status === 'all'
        ? listAllStmt.all()
        : listByStatusStmt.all(status);
      return rows.map(rowToGoal);
    },

    getPrimary: () => {
      const row = getPrimaryStmt.get();
      return row ? rowToGoal(row) : undefined;
    },
  };
};

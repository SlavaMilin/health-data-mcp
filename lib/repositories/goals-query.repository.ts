import type Database from 'better-sqlite3';
import type { GoalRow, GoalStatus } from '../types/goals.types.ts';

export interface GoalsQueryRepository {
  getById: (id: number) => GoalRow | undefined;
  list: (status?: GoalStatus | 'all') => GoalRow[];
  getPrimary: () => GoalRow | undefined;
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
    getById: (id) => getByIdStmt.get(id),

    list: (status) => {
      if (!status || status === 'all') {
        return listAllStmt.all();
      }
      return listByStatusStmt.all(status);
    },

    getPrimary: () => getPrimaryStmt.get(),
  };
};

import type Database from 'better-sqlite3';
import type { CreateGoalParams, Goal } from '../domain/goals.ts';
import { GOAL_STATUS } from '../domain/goals.constants.ts';

export interface GoalsDataRepository {
  create: (params: CreateGoalParams) => number;
  update: (goal: Goal) => void;
  clearPrimary: () => void;
  transaction: <T>(fn: () => T) => T;
}

export const createGoalsDataRepository = (db: Database.Database): GoalsDataRepository => {
  const insertStmt = db.prepare(`
    INSERT INTO goals (title, description, deadline, period, metrics, status, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE goals SET
      title = ?, description = ?, deadline = ?, period = ?,
      metrics = ?, status = ?, is_primary = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const clearPrimaryStmt = db.prepare('UPDATE goals SET is_primary = 0 WHERE is_primary = 1');

  return {
    create: (params) => {
      const result = insertStmt.run(
        params.title,
        params.description ?? null,
        params.deadline ?? null,
        params.period ?? null,
        params.metrics ? JSON.stringify(params.metrics) : null,
        params.status ?? GOAL_STATUS.ACTIVE,
        params.is_primary ? 1 : 0,
      );
      return Number(result.lastInsertRowid);
    },

    update: (goal) => {
      updateStmt.run(
        goal.title,
        goal.description,
        goal.deadline,
        goal.period,
        JSON.stringify(goal.metrics),
        goal.status,
        goal.is_primary ? 1 : 0,
        goal.id,
      );
    },

    clearPrimary: () => clearPrimaryStmt.run(),

    transaction: <T>(fn: () => T): T => db.transaction(fn)(),
  };
};

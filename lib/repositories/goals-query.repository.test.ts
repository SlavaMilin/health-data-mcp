import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createGoalsQueryRepository, type GoalsQueryRepository } from './goals-query.repository.ts';
import { runMigrations } from '../infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';
import { GOAL_STATUS } from '../domain/goals.constants.ts';

describe('GoalsQueryRepository', () => {
  let db: Database.Database;
  let repo: GoalsQueryRepository;

  const insertGoal = (data: { title: string; status?: string; is_primary?: number }) => {
    const stmt = db.prepare('INSERT INTO goals (title, status, is_primary) VALUES (?, ?, ?)');
    const result = stmt.run(data.title, data.status ?? GOAL_STATUS.ACTIVE, data.is_primary ?? 0);
    return Number(result.lastInsertRowid);
  };

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    await runMigrations(db, MIGRATIONS_DIR);
    repo = createGoalsQueryRepository(db);
  });

  describe('getById', () => {
    it('should return goal by id', () => {
      const id = insertGoal({ title: 'Test Goal' });
      const goal = repo.getById(id);
      expect(goal?.title).toBe('Test Goal');
    });

    it('should return undefined for non-existent id', () => {
      expect(repo.getById(999)).toBeUndefined();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      insertGoal({ title: 'Active 1', status: GOAL_STATUS.ACTIVE });
      insertGoal({ title: 'Active 2', status: GOAL_STATUS.ACTIVE });
      insertGoal({ title: 'Completed', status: GOAL_STATUS.COMPLETED });
      insertGoal({ title: 'Archived', status: GOAL_STATUS.ARCHIVED });
    });

    it('should list all goals when status is all', () => {
      expect(repo.list('all')).toHaveLength(4);
    });

    it('should list all goals when no status provided', () => {
      expect(repo.list()).toHaveLength(4);
    });

    it('should filter by status', () => {
      const active = repo.list(GOAL_STATUS.ACTIVE);
      expect(active).toHaveLength(2);
      expect(active.every((g) => g.status === GOAL_STATUS.ACTIVE)).toBe(true);
    });

    it('should order by is_primary DESC', () => {
      insertGoal({ title: 'Primary', status: GOAL_STATUS.ACTIVE, is_primary: 1 });
      const goals = repo.list(GOAL_STATUS.ACTIVE);
      expect(goals[0].title).toBe('Primary');
    });
  });

  describe('getPrimary', () => {
    it('should return primary active goal', () => {
      insertGoal({ title: 'Regular', status: GOAL_STATUS.ACTIVE });
      insertGoal({ title: 'Primary', status: GOAL_STATUS.ACTIVE, is_primary: 1 });
      expect(repo.getPrimary()?.title).toBe('Primary');
    });

    it('should return undefined when no primary goal', () => {
      insertGoal({ title: 'Regular', status: GOAL_STATUS.ACTIVE });
      expect(repo.getPrimary()).toBeUndefined();
    });

    it('should not return completed primary goal', () => {
      insertGoal({ title: 'Primary', status: GOAL_STATUS.COMPLETED, is_primary: 1 });
      expect(repo.getPrimary()).toBeUndefined();
    });
  });
});

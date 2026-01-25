import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createGoalsDataRepository } from './goals-data.repository.ts';
import { runMigrations } from '../infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';
import { GOAL_STATUS, GOAL_PERIOD, METRIC_DIRECTION } from '../domain/goals.constants.ts';
import type { GoalsDataPort } from '../domain/goals.port.ts';

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

describe('GoalsDataRepository', () => {
  let db: Database.Database;
  let repo: GoalsDataPort;

  const getGoal = (id: number): GoalRow | undefined => {
    return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined;
  };

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    await runMigrations(db, MIGRATIONS_DIR);
    repo = createGoalsDataRepository(db);
  });

  describe('create', () => {
    it('should insert goal and return id', () => {
      const id = repo.create({ title: 'Test Goal' });
      expect(id).toBeGreaterThan(0);

      const goal = getGoal(id);
      expect(goal?.title).toBe('Test Goal');
      expect(goal?.status).toBe(GOAL_STATUS.ACTIVE);
    });

    it('should serialize metrics to JSON', () => {
      const metrics = [{ metric_name: 'steps', target: 10000, direction: METRIC_DIRECTION.INCREASE }];
      const id = repo.create({ title: 'With Metrics', metrics });

      const goal = getGoal(id);
      expect(JSON.parse(goal!.metrics!)).toEqual(metrics);
    });

    it('should store all fields', () => {
      const id = repo.create({
        title: 'Full Goal',
        description: 'Description',
        deadline: '2026-03-15',
        period: GOAL_PERIOD.MONTH,
        status: GOAL_STATUS.ACTIVE,
        is_primary: true,
      });

      const goal = getGoal(id);
      expect(goal?.description).toBe('Description');
      expect(goal?.deadline).toBe('2026-03-15');
      expect(goal?.period).toBe(GOAL_PERIOD.MONTH);
      expect(goal?.is_primary).toBe(1);
    });
  });

  describe('update', () => {
    it('should update all fields', () => {
      const id = repo.create({ title: 'Original' });
      const original = getGoal(id)!;

      repo.update({
        id,
        title: 'Updated',
        description: 'New desc',
        deadline: '2026-06-01',
        period: GOAL_PERIOD.WEEK,
        status: GOAL_STATUS.COMPLETED,
        is_primary: true,
        metrics: [{ metric_name: 'weight', target: 70, direction: METRIC_DIRECTION.DECREASE }],
        created_at: original.created_at,
        updated_at: original.updated_at,
      });

      const updated = getGoal(id);
      expect(updated?.title).toBe('Updated');
      expect(updated?.description).toBe('New desc');
      expect(updated?.status).toBe(GOAL_STATUS.COMPLETED);
      expect(updated?.is_primary).toBe(1);
    });
  });

  describe('clearPrimary', () => {
    it('should set all is_primary to 0', () => {
      repo.create({ title: 'Primary 1', is_primary: true });
      repo.create({ title: 'Primary 2', is_primary: true });

      repo.clearPrimary();

      const goals = db.prepare('SELECT * FROM goals WHERE is_primary = 1').all();
      expect(goals).toHaveLength(0);
    });
  });

  describe('transaction', () => {
    it('should commit on success', () => {
      repo.transaction(() => {
        repo.create({ title: 'Goal 1' });
        repo.create({ title: 'Goal 2' });
      });

      const goals = db.prepare('SELECT * FROM goals').all();
      expect(goals).toHaveLength(2);
    });

    it('should rollback on error', () => {
      try {
        repo.transaction(() => {
          repo.create({ title: 'Goal 1' });
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const goals = db.prepare('SELECT * FROM goals').all();
      expect(goals).toHaveLength(0);
    });
  });
});

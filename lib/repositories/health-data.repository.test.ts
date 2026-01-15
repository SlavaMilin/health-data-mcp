import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHealthDataRepository, type HealthDataRepository } from './health-data.repository.ts';
import { runMigrations } from '../infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';
import type {
  MetricTypeRow,
  HealthMetricRow,
  WorkoutTypeRow,
  WorkoutRow,
  CountRow,
} from '../types/health-data.types.ts';

describe('HealthDataRepository', () => {
  let db: Database.Database;
  let repo: HealthDataRepository;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    await runMigrations(db, MIGRATIONS_DIR);

    repo = createHealthDataRepository(db);
  });

  describe('metric operations', () => {
    it('should insert metric type', () => {
      repo.insertMetricType('step_count', 'count', '["date", "qty"]');

      const result = db.prepare('SELECT * FROM metric_types WHERE name = ?').get('step_count') as MetricTypeRow;
      expect(result).toMatchObject({
        name: 'step_count',
        unit: 'count',
        schema: '["date", "qty"]',
      });
    });

    it('should ignore duplicate metric type', () => {
      repo.insertMetricType('step_count', 'count', '["date", "qty"]');
      repo.insertMetricType('step_count', 'count', '["date", "qty"]');

      const count = db.prepare('SELECT COUNT(*) as count FROM metric_types WHERE name = ?').get('step_count') as CountRow;
      expect(count.count).toBe(1);
    });

    it('should update metric type schema', () => {
      repo.insertMetricType('step_count', 'count', '["date"]');
      repo.updateMetricTypeSchema('step_count', '["date", "qty", "source"]');

      const result = db.prepare('SELECT schema FROM metric_types WHERE name = ?').get('step_count') as Pick<MetricTypeRow, 'schema'>;
      expect(result.schema).toBe('["date", "qty", "source"]');
    });

    it('should get metric type id', () => {
      repo.insertMetricType('step_count', 'count', '["date", "qty"]');

      const id = repo.getMetricTypeId('step_count');
      expect(id).toBe(1);
    });

    it('should insert health metric', () => {
      repo.insertMetricType('step_count', 'count', '["date", "qty"]');
      const typeId = repo.getMetricTypeId('step_count');

      const data = JSON.stringify({ date: '2024-01-01', qty: 10000 });
      repo.insertHealthMetric(typeId, '2024-01-01', data);

      const result = db.prepare('SELECT * FROM health_metrics WHERE type_id = ?').get(typeId) as HealthMetricRow;
      expect(result).toMatchObject({
        type_id: typeId,
        date: '2024-01-01',
        data: data,
      });
    });

    it('should ignore duplicate health metric', () => {
      repo.insertMetricType('step_count', 'count', '["date", "qty"]');
      const typeId = repo.getMetricTypeId('step_count');

      const data = JSON.stringify({ date: '2024-01-01', qty: 10000 });
      repo.insertHealthMetric(typeId, '2024-01-01', data);
      repo.insertHealthMetric(typeId, '2024-01-01', data);

      const count = db.prepare('SELECT COUNT(*) as count FROM health_metrics WHERE type_id = ?').get(typeId) as CountRow;
      expect(count.count).toBe(1);
    });
  });

  describe('workout operations', () => {
    it('should insert workout type', () => {
      repo.insertWorkoutType('Running', '["name", "duration"]');

      const result = db.prepare('SELECT * FROM workout_types WHERE name = ?').get('Running') as WorkoutTypeRow;
      expect(result).toMatchObject({
        name: 'Running',
        schema: '["name", "duration"]',
      });
    });

    it('should ignore duplicate workout type', () => {
      repo.insertWorkoutType('Running', '["name", "duration"]');
      repo.insertWorkoutType('Running', '["name", "duration"]');

      const count = db.prepare('SELECT COUNT(*) as count FROM workout_types WHERE name = ?').get('Running') as CountRow;
      expect(count.count).toBe(1);
    });

    it('should update workout type schema', () => {
      repo.insertWorkoutType('Running', '["name"]');
      repo.updateWorkoutTypeSchema('Running', '["name", "duration", "calories"]');

      const result = db.prepare('SELECT schema FROM workout_types WHERE name = ?').get('Running') as Pick<WorkoutTypeRow, 'schema'>;
      expect(result.schema).toBe('["name", "duration", "calories"]');
    });

    it('should get workout type id', () => {
      repo.insertWorkoutType('Running', '["name", "duration"]');

      const id = repo.getWorkoutTypeId('Running');
      expect(id).toBe(1);
    });

    it('should insert workout', () => {
      repo.insertWorkoutType('Running', '["name", "duration"]');
      const typeId = repo.getWorkoutTypeId('Running');

      const data = JSON.stringify({ name: 'Running', duration: 30 });
      repo.insertWorkout(typeId, '2024-01-01 08:00:00', '2024-01-01 08:30:00', data);

      const result = db.prepare('SELECT * FROM workouts WHERE type_id = ?').get(typeId) as WorkoutRow;
      expect(result).toMatchObject({
        type_id: typeId,
        start_date: '2024-01-01 08:00:00',
        end_date: '2024-01-01 08:30:00',
        data: data,
      });
    });

    it('should ignore duplicate workout', () => {
      repo.insertWorkoutType('Running', '["name", "duration"]');
      const typeId = repo.getWorkoutTypeId('Running');

      const data = JSON.stringify({ name: 'Running', duration: 30 });
      repo.insertWorkout(typeId, '2024-01-01 08:00:00', '2024-01-01 08:30:00', data);
      repo.insertWorkout(typeId, '2024-01-01 08:00:00', '2024-01-01 08:30:00', data);

      const count = db.prepare('SELECT COUNT(*) as count FROM workouts WHERE type_id = ?').get(typeId) as CountRow;
      expect(count.count).toBe(1);
    });
  });

  describe('transactions', () => {
    it('should commit transaction on success', () => {
      const result = repo.transaction(() => {
        repo.insertMetricType('step_count', 'count', '["date", "qty"]');
        repo.insertMetricType('heart_rate', 'bpm', '["date", "value"]');
        return 'success';
      });

      expect(result).toBe('success');

      const count = db.prepare('SELECT COUNT(*) as count FROM metric_types').get() as CountRow;
      expect(count.count).toBe(2);
    });

    it('should rollback transaction on error', () => {
      expect(() => {
        repo.transaction(() => {
          repo.insertMetricType('step_count', 'count', '["date", "qty"]');
          throw new Error('test error');
        });
      }).toThrow('test error');

      const count = db.prepare('SELECT COUNT(*) as count FROM metric_types').get() as CountRow;
      expect(count.count).toBe(0);
    });

    it('should support nested operations in transaction', () => {
      repo.transaction(() => {
        repo.insertMetricType('step_count', 'count', '["date", "qty"]');
        const typeId = repo.getMetricTypeId('step_count');

        const data1 = JSON.stringify({ date: '2024-01-01', qty: 10000 });
        const data2 = JSON.stringify({ date: '2024-01-02', qty: 12000 });

        repo.insertHealthMetric(typeId, '2024-01-01', data1);
        repo.insertHealthMetric(typeId, '2024-01-02', data2);
      });

      const metricsCount = db.prepare('SELECT COUNT(*) as count FROM health_metrics').get() as CountRow;
      expect(metricsCount.count).toBe(2);
    });
  });
});

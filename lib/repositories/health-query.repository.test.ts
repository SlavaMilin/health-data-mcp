import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHealthQueryRepository, type HealthQueryRepository } from './health-query.repository.ts';
import { createHealthDataRepository } from './health-data.repository.ts';
import { runHealthMigrations } from '../db-migrations.ts';

describe('HealthQueryRepository', () => {
  let db: Database.Database;
  let repo: HealthQueryRepository;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    await runHealthMigrations(db);

    repo = createHealthQueryRepository(db);
  });

  describe('metric types', () => {
    beforeEach(() => {
      const dataRepo = createHealthDataRepository(db);
      dataRepo.insertMetricType('step_count', 'count', '["date", "qty", "source"]');
      dataRepo.insertMetricType('heart_rate', 'bpm', '["date", "value"]');

      const stepTypeId = dataRepo.getMetricTypeId('step_count');
      dataRepo.insertHealthMetric(stepTypeId, '2024-01-01 10:00:00', JSON.stringify({ date: '2024-01-01', qty: 10000, source: 'iPhone' }));
      dataRepo.insertHealthMetric(stepTypeId, '2024-01-02 10:00:00', JSON.stringify({ date: '2024-01-02', qty: 12000, source: 'iPhone' }));
    });

    it('should get all metric types', () => {
      const types = repo.getMetricTypes();

      expect(types).toHaveLength(2);
      expect(types[0]).toMatchObject({ name: 'heart_rate', unit: 'bpm' });
      expect(types[1]).toMatchObject({ name: 'step_count', unit: 'count' });
    });

    it('should get metric metadata', () => {
      const metadata = repo.getMetricMetadata('step_count');

      expect(metadata).toMatchObject({
        count: 2,
        min_date: '2024-01-01 10:00:00',
        max_date: '2024-01-02 10:00:00',
      });
    });

    it('should return zero count for metric without data', () => {
      const metadata = repo.getMetricMetadata('heart_rate');

      expect(metadata?.count).toBe(0);
    });

    it('should get metric example', () => {
      const example = repo.getMetricExample('step_count');

      expect(example).toBeDefined();
      const data = JSON.parse(example!.data);
      expect(data).toMatchObject({ date: '2024-01-01', qty: 10000, source: 'iPhone' });
    });

    it('should return undefined for metric without example', () => {
      const example = repo.getMetricExample('heart_rate');

      expect(example).toBeUndefined();
    });
  });

  describe('workout types', () => {
    beforeEach(() => {
      const dataRepo = createHealthDataRepository(db);
      dataRepo.insertWorkoutType('Running', '["name", "duration"]');
      dataRepo.insertWorkoutType('Walking', '["name", "duration"]');

      const runningTypeId = dataRepo.getWorkoutTypeId('Running');
      dataRepo.insertWorkout(runningTypeId, '2024-01-01 08:00:00', '2024-01-01 08:30:00', JSON.stringify({ name: 'Running', duration: 30 }));
    });

    it('should get all workout types', () => {
      const types = repo.getWorkoutTypes();

      expect(types).toHaveLength(2);
      expect(types[0]).toMatchObject({ name: 'Running' });
      expect(types[1]).toMatchObject({ name: 'Walking' });
    });

    it('should get workout metadata', () => {
      const metadata = repo.getWorkoutMetadata('Running');

      expect(metadata).toMatchObject({
        count: 1,
        min_date: '2024-01-01 08:00:00',
        max_date: '2024-01-01 08:00:00',
      });
    });

    it('should return zero count for workout type without data', () => {
      const metadata = repo.getWorkoutMetadata('Walking');

      expect(metadata?.count).toBe(0);
    });
  });

  describe('queryMetricsRaw', () => {
    beforeEach(() => {
      const dataRepo = createHealthDataRepository(db);
      dataRepo.insertMetricType('step_count', 'count', '["date", "qty"]');
      const typeId = dataRepo.getMetricTypeId('step_count');

      dataRepo.insertHealthMetric(typeId, '2024-01-01 10:00:00', JSON.stringify({ date: '2024-01-01', qty: 10000 }));
      dataRepo.insertHealthMetric(typeId, '2024-01-02 10:00:00', JSON.stringify({ date: '2024-01-02', qty: 12000 }));
      dataRepo.insertHealthMetric(typeId, '2024-01-03 10:00:00', JSON.stringify({ date: '2024-01-03', qty: 8000 }));
    });

    it('should query all metrics', () => {
      const results = repo.queryMetricsRaw({});

      expect(results).toHaveLength(3);
    });

    it('should filter by metric_name', () => {
      const results = repo.queryMetricsRaw({ metric_name: 'step_count' });

      expect(results).toHaveLength(3);
    });

    it('should filter by date range', () => {
      const results = repo.queryMetricsRaw({
        start_date: '2024-01-02',
        end_date: '2024-01-02',
      });

      expect(results).toHaveLength(1);
    });

    it('should respect limit', () => {
      const results = repo.queryMetricsRaw({ limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should order by date descending', () => {
      const results = repo.queryMetricsRaw({}) as Array<{ date: string }>;

      expect(results[0].date).toBe('2024-01-03 10:00:00');
      expect(results[2].date).toBe('2024-01-01 10:00:00');
    });
  });

  describe('queryMetricsAggregated', () => {
    beforeEach(() => {
      const dataRepo = createHealthDataRepository(db);
      dataRepo.insertMetricType('step_count', 'count', '["date", "qty"]');
      const typeId = dataRepo.getMetricTypeId('step_count');

      dataRepo.insertHealthMetric(typeId, '2024-01-01 10:00:00', JSON.stringify({ date: '2024-01-01', qty: 10000 }));
      dataRepo.insertHealthMetric(typeId, '2024-01-02 10:00:00', JSON.stringify({ date: '2024-01-02', qty: 12000 }));
      dataRepo.insertHealthMetric(typeId, '2024-01-03 10:00:00', JSON.stringify({ date: '2024-01-03', qty: 8000 }));
    });

    it('should sum metrics', () => {
      const results = repo.queryMetricsAggregated({
        metric_name: 'step_count',
        aggregation: 'sum',
      }) as Array<{ sum_value: number }>;

      expect(results).toHaveLength(1);
      expect(results[0].sum_value).toBe(30000);
    });

    it('should average metrics', () => {
      const results = repo.queryMetricsAggregated({
        metric_name: 'step_count',
        aggregation: 'avg',
      }) as Array<{ avg_value: number }>;

      expect(results).toHaveLength(1);
      expect(results[0].avg_value).toBe(10000);
    });

    it('should count metrics', () => {
      const results = repo.queryMetricsAggregated({
        metric_name: 'step_count',
        aggregation: 'count',
      }) as Array<{ count_value: number }>;

      expect(results).toHaveLength(1);
      expect(results[0].count_value).toBe(3);
    });

    it('should filter by date range', () => {
      const results = repo.queryMetricsAggregated({
        metric_name: 'step_count',
        aggregation: 'sum',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
      }) as Array<{ sum_value: number }>;

      expect(results[0].sum_value).toBe(22000);
    });
  });

  describe('executeSQL', () => {
    it('should execute valid SQL', () => {
      const results = repo.executeSQL('SELECT 1 + 1 as result');

      expect(results).toEqual([{ result: 2 }]);
    });

    it('should throw on invalid SQL', () => {
      expect(() => repo.executeSQL('INVALID SQL')).toThrow();
    });
  });

  describe('getSchemaInfo', () => {
    it('should return tables and views', () => {
      const schemaInfo = repo.getSchemaInfo();

      expect(schemaInfo.tables.length).toBeGreaterThan(0);
      expect(schemaInfo.views.length).toBeGreaterThan(0);

      const tableNames = schemaInfo.tables.map((t) => t.name);
      expect(tableNames).toContain('metric_types');
      expect(tableNames).toContain('health_metrics');

      const viewNames = schemaInfo.views.map((v) => v.name);
      expect(viewNames).toContain('metrics_with_types');
    });
  });
});

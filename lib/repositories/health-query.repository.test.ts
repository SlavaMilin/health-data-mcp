import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHealthQueryRepository } from './health-query.repository.ts';
import { createHealthDataRepository } from './health-data.repository.ts';
import { runMigrations } from '../infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';
import type { HealthQueryPort } from '../domain/health.port.ts';
import type { EnrichedMetricType, EnrichedWorkoutType } from '../domain/health.ts';

describe('HealthQueryRepository', () => {
  let db: Database.Database;
  let repo: HealthQueryPort;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    await runMigrations(db, MIGRATIONS_DIR);

    repo = createHealthQueryRepository(db);
  });

  describe('listMetricTypes', () => {
    beforeEach(() => {
      const dataRepo = createHealthDataRepository(db);
      dataRepo.insertMetricType('step_count', 'count', '["date", "qty", "source"]');
      dataRepo.insertMetricType('heart_rate', 'bpm', '["date", "value"]');

      const stepTypeId = dataRepo.getMetricTypeId('step_count');
      dataRepo.insertHealthMetric(stepTypeId, '2024-01-01 10:00:00', JSON.stringify({ date: '2024-01-01', qty: 10000, source: 'iPhone' }));
      dataRepo.insertHealthMetric(stepTypeId, '2024-01-02 10:00:00', JSON.stringify({ date: '2024-01-02', qty: 12000, source: 'iPhone' }));
    });

    it('should return enriched metric types', () => {
      const types = repo.listMetricTypes();

      expect(types).toHaveLength(2);
      expect(types[1]).toMatchObject({
        name: 'step_count',
        unit: 'count',
        schema: ['date', 'qty', 'source'],
        count: 2,
      });
    });

    it('should include date_range for metrics with data', () => {
      const types = repo.listMetricTypes();
      const stepCount = types.find(t => t.name === 'step_count');

      expect(stepCount?.date_range).toMatchObject({
        min: '2024-01-01 10:00:00',
        max: '2024-01-02 10:00:00',
      });
    });

    it('should return null date_range for metrics without data', () => {
      const types = repo.listMetricTypes();
      const heartRate = types.find(t => t.name === 'heart_rate');

      expect(heartRate?.count).toBe(0);
      expect(heartRate?.date_range).toBeNull();
    });

    it('should include example for metrics with data', () => {
      const types = repo.listMetricTypes();
      const stepCount = types.find(t => t.name === 'step_count');

      expect(stepCount?.example).toMatchObject({ date: '2024-01-01', qty: 10000, source: 'iPhone' });
    });

    it('should return null example for metrics without data', () => {
      const types = repo.listMetricTypes();
      const heartRate = types.find(t => t.name === 'heart_rate');

      expect(heartRate?.example).toBeNull();
    });
  });

  describe('listWorkoutTypes', () => {
    beforeEach(() => {
      const dataRepo = createHealthDataRepository(db);
      dataRepo.insertWorkoutType('Running', '["name", "duration"]');
      dataRepo.insertWorkoutType('Walking', '["name", "duration"]');

      const runningTypeId = dataRepo.getWorkoutTypeId('Running');
      dataRepo.insertWorkout(runningTypeId, '2024-01-01 08:00:00', '2024-01-01 08:30:00', JSON.stringify({ name: 'Running', duration: 30 }));
    });

    it('should return enriched workout types', () => {
      const types = repo.listWorkoutTypes();

      expect(types).toHaveLength(2);
      expect(types[0]).toMatchObject({
        name: 'Running',
        schema: ['name', 'duration'],
        count: 1,
      });
    });

    it('should include date_range for workout types with data', () => {
      const types = repo.listWorkoutTypes();
      const running = types.find(t => t.name === 'Running');

      expect(running?.date_range).toMatchObject({
        min: '2024-01-01 08:00:00',
        max: '2024-01-01 08:00:00',
      });
    });

    it('should return null date_range for workout types without data', () => {
      const types = repo.listWorkoutTypes();
      const walking = types.find(t => t.name === 'Walking');

      expect(walking?.count).toBe(0);
      expect(walking?.date_range).toBeNull();
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

  describe('getAnalysisHistory', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO analysis_history (date, type, analysis, created_at)
        VALUES ('2024-01-07', 'weekly', '# Weekly Analysis 1', '2024-01-08 09:00:00')
      `).run();
      db.prepare(`
        INSERT INTO analysis_history (date, type, analysis, created_at)
        VALUES ('2024-01-14', 'weekly', '# Weekly Analysis 2', '2024-01-15 09:00:00')
      `).run();
      db.prepare(`
        INSERT INTO analysis_history (date, type, analysis, created_at)
        VALUES ('2024-01-08', 'daily', '# Daily Analysis', '2024-01-09 09:00:00')
      `).run();
      db.prepare(`
        INSERT INTO analysis_history (date, type, analysis, created_at)
        VALUES ('2024-01-31', 'monthly', '# Monthly Analysis', '2024-02-01 09:00:00')
      `).run();
    });

    it('should return all analyses ordered by date descending', () => {
      const results = repo.getAnalysisHistory({});

      expect(results).toHaveLength(4);
      expect(results[0].date).toBe('2024-01-31');
      expect(results[3].date).toBe('2024-01-07');
    });

    it('should filter by type', () => {
      const results = repo.getAnalysisHistory({ type: 'weekly' });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.type === 'weekly')).toBe(true);
    });

    it('should filter by start_date', () => {
      const results = repo.getAnalysisHistory({ start_date: '2024-01-10' });

      expect(results).toHaveLength(2);
      expect(results[0].date).toBe('2024-01-31');
      expect(results[1].date).toBe('2024-01-14');
    });

    it('should filter by end_date', () => {
      const results = repo.getAnalysisHistory({ end_date: '2024-01-10' });

      expect(results).toHaveLength(2);
      expect(results[0].date).toBe('2024-01-08');
      expect(results[1].date).toBe('2024-01-07');
    });

    it('should filter by date range', () => {
      const results = repo.getAnalysisHistory({
        start_date: '2024-01-08',
        end_date: '2024-01-14',
      });

      expect(results).toHaveLength(2);
    });

    it('should respect limit', () => {
      const results = repo.getAnalysisHistory({ limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should use default limit of 10', () => {
      const results = repo.getAnalysisHistory({});

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should combine type and date filters', () => {
      const results = repo.getAnalysisHistory({
        type: 'weekly',
        start_date: '2024-01-10',
      });

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe('2024-01-14');
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHealthQueryService, type HealthQueryService } from './health-query.service.ts';
import type { HealthQueryRepository } from '../repositories/health-query.repository.ts';

describe('HealthQueryService', () => {
  let service: HealthQueryService;
  let mockRepo: HealthQueryRepository;

  beforeEach(() => {
    mockRepo = {
      listMetricTypes: vi.fn(() => [
        { name: 'step_count', unit: 'count', schema: ['date', 'qty', 'source'], count: 100, date_range: { min: '2024-01-01', max: '2024-01-31' }, example: { date: '2024-01-01', qty: 10000, source: 'iPhone' } },
        { name: 'heart_rate', unit: 'bpm', schema: ['date', 'value'], count: 0, date_range: null, example: null },
      ]),
      listWorkoutTypes: vi.fn(() => [
        { name: 'Running', schema: ['name', 'duration'], count: 50, date_range: { min: '2024-01-01 08:00:00', max: '2024-01-31 08:00:00' } },
        { name: 'Walking', schema: ['name', 'duration'], count: 0, date_range: null },
      ]),
      queryMetricsRaw: vi.fn(() => [{ id: 1, metric_name: 'step_count', qty: 10000 }]),
      queryMetricsAggregated: vi.fn(() => [{ metric_name: 'step_count', sum_value: 300000 }]),
      executeSQL: vi.fn(() => [{ result: 42 }]),
      getSchemaInfo: vi.fn(() => ({
        tables: [{ name: 'metric_types', sql: 'CREATE TABLE...' }],
        views: [{ name: 'metrics_with_types', sql: 'CREATE VIEW...' }],
      })),
      getAnalysisHistory: vi.fn(() => [
        { id: 1, date: '2024-01-07', type: 'weekly' as const, analysis: '# Weekly', created_at: '2024-01-08' },
      ]),
    };

    service = createHealthQueryService(mockRepo);
  });

  describe('queryMetrics', () => {
    it('should call queryMetricsRaw when aggregation is none', () => {
      const params = { metric_name: 'step_count', aggregation: 'none' as const };
      service.queryMetrics(params);

      expect(mockRepo.queryMetricsRaw).toHaveBeenCalledWith(params);
      expect(mockRepo.queryMetricsAggregated).not.toHaveBeenCalled();
    });

    it('should call queryMetricsRaw when aggregation is not specified', () => {
      const params = { metric_name: 'step_count' };
      service.queryMetrics(params);

      expect(mockRepo.queryMetricsRaw).toHaveBeenCalledWith(params);
      expect(mockRepo.queryMetricsAggregated).not.toHaveBeenCalled();
    });

    it('should call queryMetricsAggregated when aggregation is specified', () => {
      const params = { metric_name: 'step_count', aggregation: 'sum' as const };
      service.queryMetrics(params);

      expect(mockRepo.queryMetricsAggregated).toHaveBeenCalledWith(params);
      expect(mockRepo.queryMetricsRaw).not.toHaveBeenCalled();
    });

    it('should return results from repository', () => {
      const result = service.queryMetrics({ metric_name: 'step_count' });

      expect(result).toEqual([{ id: 1, metric_name: 'step_count', qty: 10000 }]);
    });
  });

  describe('listMetricTypes', () => {
    it('should return metric types from repository', () => {
      const result = service.listMetricTypes();

      expect(result).toHaveLength(2);
      expect(mockRepo.listMetricTypes).toHaveBeenCalled();
    });

    it('should pass through enriched data from repository', () => {
      const result = service.listMetricTypes();

      expect(result[0]).toMatchObject({
        name: 'step_count',
        unit: 'count',
        schema: ['date', 'qty', 'source'],
        count: 100,
        date_range: { min: '2024-01-01', max: '2024-01-31' },
        example: { date: '2024-01-01', qty: 10000, source: 'iPhone' },
      });
    });
  });

  describe('listWorkoutTypes', () => {
    it('should return workout types from repository', () => {
      const result = service.listWorkoutTypes();

      expect(result).toHaveLength(2);
      expect(mockRepo.listWorkoutTypes).toHaveBeenCalled();
    });

    it('should pass through enriched data from repository', () => {
      const result = service.listWorkoutTypes();

      expect(result[0]).toMatchObject({
        name: 'Running',
        schema: ['name', 'duration'],
        count: 50,
        date_range: { min: '2024-01-01 08:00:00', max: '2024-01-31 08:00:00' },
      });
    });
  });

  describe('executeSQL', () => {
    it('should return results on success', () => {
      const result = service.executeSQL('SELECT 1');

      expect(result).toEqual({ results: [{ result: 42 }] });
    });

    it('should return error on failure', () => {
      mockRepo.executeSQL = vi.fn(() => {
        throw new Error('SQL syntax error');
      });

      const result = service.executeSQL('INVALID SQL');

      expect(result).toEqual({ error: 'SQL syntax error' });
    });
  });

  describe('getAnalysisHistory', () => {
    it('should pass params to repository', () => {
      const params = { type: 'weekly' as const, limit: 5 };
      service.getAnalysisHistory(params);

      expect(mockRepo.getAnalysisHistory).toHaveBeenCalledWith(params);
    });

    it('should return results from repository', () => {
      const result = service.getAnalysisHistory({});

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('weekly');
    });
  });
});

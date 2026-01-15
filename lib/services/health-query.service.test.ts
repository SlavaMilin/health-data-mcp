import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHealthQueryService, type HealthQueryService } from './health-query.service.ts';
import type { HealthQueryRepository } from '../repositories/health-query.repository.ts';

describe('HealthQueryService', () => {
  let service: HealthQueryService;
  let mockRepo: HealthQueryRepository;

  beforeEach(() => {
    mockRepo = {
      getMetricTypes: vi.fn(() => [
        { name: 'step_count', unit: 'count', schema: '["date", "qty", "source"]' },
        { name: 'heart_rate', unit: 'bpm', schema: '["date", "value"]' },
      ]),
      getMetricMetadata: vi.fn((name) => {
        if (name === 'step_count') {
          return { count: 100, min_date: '2024-01-01', max_date: '2024-01-31' };
        }
        return { count: 0, min_date: null, max_date: null };
      }),
      getMetricExample: vi.fn((name) => {
        if (name === 'step_count') {
          return { data: JSON.stringify({ date: '2024-01-01', qty: 10000, source: 'iPhone' }) };
        }
        return undefined;
      }),
      getWorkoutTypes: vi.fn(() => [
        { name: 'Running', schema: '["name", "duration"]' },
        { name: 'Walking', schema: '["name", "duration"]' },
      ]),
      getWorkoutMetadata: vi.fn((name) => {
        if (name === 'Running') {
          return { count: 50, min_date: '2024-01-01 08:00:00', max_date: '2024-01-31 08:00:00' };
        }
        return { count: 0, min_date: null, max_date: null };
      }),
      queryMetricsRaw: vi.fn(() => [{ id: 1, metric_name: 'step_count', qty: 10000 }]),
      queryMetricsAggregated: vi.fn(() => [{ metric_name: 'step_count', sum_value: 300000 }]),
      executeSQL: vi.fn(() => [{ result: 42 }]),
      getSchemaInfo: vi.fn(() => ({
        tables: [{ name: 'metric_types', sql: 'CREATE TABLE...' }],
        views: [{ name: 'metrics_with_types', sql: 'CREATE VIEW...' }],
      })),
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
    it('should return enriched metric types', () => {
      const result = service.listMetricTypes();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'step_count',
        unit: 'count',
        schema: ['date', 'qty', 'source'],
        count: 100,
        date_range: { min: '2024-01-01', max: '2024-01-31' },
        example: { date: '2024-01-01', qty: 10000, source: 'iPhone' },
      });
    });

    it('should return null date_range for metrics without data', () => {
      const result = service.listMetricTypes();

      expect(result[1]).toMatchObject({
        name: 'heart_rate',
        count: 0,
        date_range: null,
        example: null,
      });
    });

    it('should parse schema JSON', () => {
      const result = service.listMetricTypes();

      expect(result[0].schema).toEqual(['date', 'qty', 'source']);
      expect(result[1].schema).toEqual(['date', 'value']);
    });

    it('should handle null schema', () => {
      mockRepo.getMetricTypes = vi.fn(() => [{ name: 'test', unit: 'count', schema: null }]);

      const result = service.listMetricTypes();

      expect(result[0].schema).toEqual([]);
    });
  });

  describe('listWorkoutTypes', () => {
    it('should return enriched workout types', () => {
      const result = service.listWorkoutTypes();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'Running',
        schema: ['name', 'duration'],
        count: 50,
        date_range: { min: '2024-01-01 08:00:00', max: '2024-01-31 08:00:00' },
      });
    });

    it('should return null date_range for workout types without data', () => {
      const result = service.listWorkoutTypes();

      expect(result[1]).toMatchObject({
        name: 'Walking',
        count: 0,
        date_range: null,
      });
    });

    it('should handle null schema', () => {
      mockRepo.getWorkoutTypes = vi.fn(() => [{ name: 'Test', schema: null }]);

      const result = service.listWorkoutTypes();

      expect(result[0].schema).toEqual([]);
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
});

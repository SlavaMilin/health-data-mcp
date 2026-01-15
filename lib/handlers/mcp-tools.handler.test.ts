import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMcpToolsHandler, type McpToolsHandler } from './mcp-tools.handler.ts';
import type { HealthQueryService } from '../services/health-query.service.ts';
import type { HealthQueryRepository } from '../repositories/health-query.repository.ts';

describe('McpToolsHandler', () => {
  let handler: McpToolsHandler;
  let mockService: HealthQueryService;
  let mockRepo: HealthQueryRepository;

  beforeEach(() => {
    mockService = {
      queryMetrics: vi.fn(() => [{ id: 1, metric_name: 'step_count', qty: 10000 }]),
      listMetricTypes: vi.fn(() => [
        { name: 'step_count', unit: 'count', schema: ['date', 'qty'], count: 100, date_range: null, example: null },
      ]),
      listWorkoutTypes: vi.fn(() => [
        { name: 'Running', schema: ['name', 'duration'], count: 50, date_range: null },
      ]),
      executeSQL: vi.fn(() => ({ results: [{ result: 42 }] })),
    };

    mockRepo = {
      getMetricTypes: vi.fn(),
      getMetricMetadata: vi.fn(),
      getMetricExample: vi.fn(),
      getWorkoutTypes: vi.fn(),
      getWorkoutMetadata: vi.fn(),
      queryMetricsRaw: vi.fn(),
      queryMetricsAggregated: vi.fn(),
      executeSQL: vi.fn(),
      getSchemaInfo: vi.fn(() => ({
        tables: [{ name: 'metric_types', sql: 'CREATE TABLE...' }],
        views: [{ name: 'metrics_with_types', sql: 'CREATE VIEW...' }],
      })),
    };

    handler = createMcpToolsHandler(mockService, mockRepo);
  });

  describe('queryMetrics', () => {
    it('should return text response on success', () => {
      const result = handler.queryMetrics({ metric_name: 'step_count' });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      expect(data).toEqual([{ id: 1, metric_name: 'step_count', qty: 10000 }]);
    });

    it('should return error response with hint on failure', () => {
      mockService.queryMetrics = vi.fn(() => {
        throw new Error('Database error');
      });

      const result = handler.queryMetrics({ metric_name: 'step_count' });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toBe('Database error');
      expect(data.hint).toBe('Use list_metric_types to see available metrics and their schemas');
    });
  });

  describe('listMetricTypes', () => {
    it('should return text response on success', () => {
      const result = handler.listMetricTypes();

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('step_count');
    });

    it('should return error response on failure', () => {
      mockService.listMetricTypes = vi.fn(() => {
        throw new Error('Query failed');
      });

      const result = handler.listMetricTypes();

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toBe('Query failed');
    });
  });

  describe('listWorkoutTypes', () => {
    it('should return text response on success', () => {
      const result = handler.listWorkoutTypes();

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Running');
    });

    it('should return error response on failure', () => {
      mockService.listWorkoutTypes = vi.fn(() => {
        throw new Error('Query failed');
      });

      const result = handler.listWorkoutTypes();

      expect(result.isError).toBe(true);
    });
  });

  describe('executeSQL', () => {
    it('should return text response on success', () => {
      const result = handler.executeSQL({ query: 'SELECT 1' });

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      expect(data).toEqual([{ result: 42 }]);
    });

    it('should return error response with hint on failure', () => {
      mockService.executeSQL = vi.fn(() => ({ error: 'Syntax error' }));

      const result = handler.executeSQL({ query: 'INVALID' });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toBe('Syntax error');
      expect(data.hint).toContain('Check your SQL syntax');
    });
  });

  describe('getSchemaResource', () => {
    it('should return schema info with query patterns', () => {
      const result = handler.getSchemaResource();

      expect(result.tables).toHaveLength(1);
      expect(result.views).toHaveLength(1);
      expect(result.query_patterns).toBeDefined();
      expect(result.how_to_use_schema).toBeDefined();
    });
  });

  describe('response formatting', () => {
    it('should format JSON with indentation', () => {
      const result = handler.listMetricTypes();
      const text = result.content[0].text;

      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });
});

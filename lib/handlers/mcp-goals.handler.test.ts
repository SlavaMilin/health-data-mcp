import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMcpGoalsHandler, type McpGoalsHandler } from './mcp-goals.handler.ts';
import type { GoalsService } from '../services/goals.service.ts';
import { GOAL_STATUS } from '../constants/goals.constants.ts';
import type { Goal } from '../types/goals.types.ts';

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 1,
  title: 'Test Goal',
  description: null,
  deadline: null,
  period: null,
  status: GOAL_STATUS.ACTIVE,
  is_primary: false,
  metrics: [],
  created_at: '2026-01-01 00:00:00',
  updated_at: '2026-01-01 00:00:00',
  ...overrides,
});

describe('McpGoalsHandler', () => {
  let handler: McpGoalsHandler;
  let mockService: GoalsService;

  beforeEach(() => {
    mockService = {
      create: vi.fn(() => 1),
      update: vi.fn(() => makeGoal()),
      list: vi.fn(() => []),
      getById: vi.fn(() => null),
      getPrimary: vi.fn(() => null),
    };

    handler = createMcpGoalsHandler(mockService);
  });

  describe('create', () => {
    it('should return id on success', () => {
      mockService.getById = vi.fn(() => makeGoal({ id: 1, title: 'New Goal' }));

      const result = handler.create({ title: 'New Goal' });
      const data = JSON.parse(result.content[0].text);

      expect(data.id).toBe(1);
      expect(result.isError).toBeUndefined();
    });

    it('should return error on failure', () => {
      mockService.create = vi.fn(() => {
        throw new Error('Failed');
      });

      const result = handler.create({ title: 'New Goal' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Failed');
    });
  });

  describe('update', () => {
    it('should return updated goal', () => {
      mockService.update = vi.fn(() => makeGoal({ title: 'Updated' }));

      const result = handler.update({ id: 1, title: 'Updated' });
      const data = JSON.parse(result.content[0].text);

      expect(data.title).toBe('Updated');
    });

    it('should return error if not found', () => {
      mockService.update = vi.fn(() => {
        throw new Error('Goal not found: 999');
      });

      const result = handler.update({ id: 999, title: 'Updated' });

      expect(result.isError).toBe(true);
    });
  });

  describe('list', () => {
    it('should return goals array', () => {
      mockService.list = vi.fn(() => [makeGoal({ id: 1 }), makeGoal({ id: 2 })]);

      const result = handler.list({ status: GOAL_STATUS.ACTIVE });
      const data = JSON.parse(result.content[0].text);

      expect(data).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should return goal if found', () => {
      mockService.getById = vi.fn(() => makeGoal({ title: 'Found' }));

      const result = handler.get({ id: 1 });
      const data = JSON.parse(result.content[0].text);

      expect(data.title).toBe('Found');
    });

    it('should return error if not found', () => {
      mockService.getById = vi.fn(() => null);

      const result = handler.get({ id: 999 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Goal not found: 999');
    });
  });

  describe('getActiveGoals', () => {
    it('should return active goals for resource', () => {
      mockService.list = vi.fn(() => [makeGoal()]);

      const result = handler.getActiveGoals();

      expect(mockService.list).toHaveBeenCalledWith({ status: 'active' });
      expect(result).toHaveLength(1);
    });
  });
});

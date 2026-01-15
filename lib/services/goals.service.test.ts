import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGoalsService, type GoalsService } from './goals.service.ts';
import type { GoalsQueryRepository } from '../repositories/goals-query.repository.ts';
import type { GoalsDataRepository } from '../repositories/goals-data.repository.ts';
import { GOAL_STATUS, GOAL_PERIOD, METRIC_DIRECTION } from '../constants/goals.constants.ts';
import type { GoalRow } from '../types/goals.types.ts';

const makeGoalRow = (overrides: Partial<GoalRow> = {}): GoalRow => ({
  id: 1,
  title: 'Test Goal',
  description: null,
  deadline: null,
  period: null,
  metrics: null,
  status: GOAL_STATUS.ACTIVE,
  is_primary: 0,
  created_at: '2026-01-01 00:00:00',
  updated_at: '2026-01-01 00:00:00',
  ...overrides,
});

describe('GoalsService', () => {
  let service: GoalsService;
  let mockQueryRepo: GoalsQueryRepository;
  let mockDataRepo: GoalsDataRepository;

  beforeEach(() => {
    mockQueryRepo = {
      getById: vi.fn(),
      list: vi.fn(() => []),
      getPrimary: vi.fn(),
    };

    mockDataRepo = {
      create: vi.fn(() => 1),
      update: vi.fn(),
      clearPrimary: vi.fn(),
      transaction: vi.fn((fn) => fn()),
    };

    service = createGoalsService(mockQueryRepo, mockDataRepo);
  });

  describe('create', () => {
    it('should create goal and return id', () => {
      const id = service.create({ title: 'New Goal' });

      expect(mockDataRepo.create).toHaveBeenCalledWith({ title: 'New Goal' });
      expect(id).toBe(1);
    });

    it('should clear primary before creating primary goal', () => {
      service.create({ title: 'Primary', is_primary: true });

      expect(mockDataRepo.transaction).toHaveBeenCalled();
      expect(mockDataRepo.clearPrimary).toHaveBeenCalled();
    });

    it('should not clear primary for non-primary goal', () => {
      service.create({ title: 'Regular' });

      expect(mockDataRepo.clearPrimary).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw if goal not found', () => {
      mockQueryRepo.getById = vi.fn(() => undefined);

      expect(() => service.update(999, { title: 'Updated' })).toThrow('Goal not found: 999');
    });

    it('should merge params with existing goal', () => {
      mockQueryRepo.getById = vi.fn(() => makeGoalRow({ title: 'Original', description: 'Keep me' }));

      service.update(1, { title: 'Updated' });

      expect(mockDataRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated', description: 'Keep me' }),
      );
    });

    it('should allow setting description to null', () => {
      mockQueryRepo.getById = vi.fn(() => makeGoalRow({ description: 'Has description' }));

      service.update(1, { description: null });

      expect(mockDataRepo.update).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    });

    it('should clear primary when setting new primary', () => {
      mockQueryRepo.getById = vi.fn(() => makeGoalRow({ is_primary: 0 }));

      service.update(1, { is_primary: true });

      expect(mockDataRepo.transaction).toHaveBeenCalled();
      expect(mockDataRepo.clearPrimary).toHaveBeenCalled();
    });

    it('should not clear primary if already primary', () => {
      mockQueryRepo.getById = vi.fn(() => makeGoalRow({ is_primary: 1 }));

      service.update(1, { is_primary: true });

      expect(mockDataRepo.clearPrimary).not.toHaveBeenCalled();
    });

    it('should return updated goal', () => {
      // First call returns original, second call returns updated (simulating DB state after update)
      mockQueryRepo.getById = vi
        .fn()
        .mockReturnValueOnce(makeGoalRow())
        .mockReturnValueOnce(makeGoalRow({ title: 'Updated', status: GOAL_STATUS.COMPLETED }));

      const result = service.update(1, { title: 'Updated', status: GOAL_STATUS.COMPLETED });

      expect(result.title).toBe('Updated');
      expect(result.status).toBe(GOAL_STATUS.COMPLETED);
    });
  });

  describe('list', () => {
    it('should return goals converted from rows', () => {
      mockQueryRepo.list = vi.fn(() => [
        makeGoalRow({ id: 1, title: 'Goal 1' }),
        makeGoalRow({ id: 2, title: 'Goal 2' }),
      ]);

      const result = service.list();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Goal 1');
    });

    it('should pass status filter to repository', () => {
      service.list({ status: GOAL_STATUS.COMPLETED });

      expect(mockQueryRepo.list).toHaveBeenCalledWith(GOAL_STATUS.COMPLETED);
    });

    it('should parse metrics JSON', () => {
      const metrics = [{ metric_name: 'steps', target: 10000, direction: METRIC_DIRECTION.INCREASE }];
      mockQueryRepo.list = vi.fn(() => [makeGoalRow({ metrics: JSON.stringify(metrics) })]);

      const result = service.list();

      expect(result[0].metrics).toEqual(metrics);
    });

    it('should convert is_primary to boolean', () => {
      mockQueryRepo.list = vi.fn(() => [makeGoalRow({ is_primary: 1 })]);

      const result = service.list();

      expect(result[0].is_primary).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return null if not found', () => {
      mockQueryRepo.getById = vi.fn(() => undefined);

      expect(service.getById(999)).toBeNull();
    });

    it('should return goal if found', () => {
      mockQueryRepo.getById = vi.fn(() => makeGoalRow({ title: 'Found' }));

      const result = service.getById(1);

      expect(result?.title).toBe('Found');
    });
  });

  describe('getPrimary', () => {
    it('should return null if no primary', () => {
      mockQueryRepo.getPrimary = vi.fn(() => undefined);

      expect(service.getPrimary()).toBeNull();
    });

    it('should return primary goal', () => {
      mockQueryRepo.getPrimary = vi.fn(() => makeGoalRow({ title: 'Primary', is_primary: 1 }));

      const result = service.getPrimary();

      expect(result?.title).toBe('Primary');
      expect(result?.is_primary).toBe(true);
    });
  });
});

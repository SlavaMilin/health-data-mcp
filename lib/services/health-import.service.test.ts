import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import { createHealthImportService, type HealthImportService } from './health-import.service.ts';
import type { HealthDataPort } from '../domain/health.port.ts';
import type { HealthImportData } from '../types/health-data.types.ts';

describe('HealthImportService', () => {
  let healthImportService: HealthImportService;
  let mockRepo: HealthDataPort;
  let mockLogger: FastifyBaseLogger;

  beforeEach(() => {
    mockRepo = {
      insertMetricType: vi.fn(),
      updateMetricTypeSchema: vi.fn(),
      getMetricTypeId: vi.fn(() => 1),
      insertHealthMetric: vi.fn(),
      insertWorkoutType: vi.fn(),
      updateWorkoutTypeSchema: vi.fn(),
      getWorkoutTypeId: vi.fn(() => 1),
      insertWorkout: vi.fn(),
      transaction: vi.fn((fn) => fn()),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as FastifyBaseLogger;

    healthImportService = createHealthImportService(mockRepo, mockLogger);
  });

  describe('importHealthData', () => {
    it('should migrate metrics data', async () => {
      const jsonData = {
        metrics: {
          step_count: {
            entries: [
              { date: '2024-01-01', qty: 10000, source: 'iPhone' },
              { date: '2024-01-02', qty: 12000, source: 'iPhone' },
            ],
            units: 'count',
          },
        },
      };

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.metrics).toBe(2);
      expect(result.workouts).toBe(0);

      expect(mockRepo.insertMetricType).toHaveBeenCalledWith(
        'step_count',
        'count',
        expect.any(String)
      );
      expect(mockRepo.insertHealthMetric).toHaveBeenCalledTimes(2);
    });

    it('should normalize JSON keys alphabetically', async () => {
      const jsonData = {
        metrics: {
          step_count: {
            entries: [{ source: 'iPhone', date: '2024-01-01', qty: 10000 }],
            units: 'count',
          },
        },
      };

      await healthImportService.importHealthData(jsonData);

      const normalizedData = JSON.stringify({ date: '2024-01-01', qty: 10000, source: 'iPhone' });
      expect(mockRepo.insertHealthMetric).toHaveBeenCalledWith(1, '2024-01-01', normalizedData);
    });

    it('should migrate workouts data', async () => {
      const jsonData = {
        workouts: [
          {
            name: 'Running',
            start: '2024-01-01 08:00:00',
            end: '2024-01-01 08:30:00',
            duration: 30,
          },
        ],
      };

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.metrics).toBe(0);
      expect(result.workouts).toBe(1);

      expect(mockRepo.insertWorkoutType).toHaveBeenCalledWith('Running', expect.any(String));
      expect(mockRepo.insertWorkout).toHaveBeenCalledTimes(1);
    });

    it('should exclude route field from workouts', async () => {
      const jsonData = {
        workouts: [
          {
            name: 'Running',
            start: '2024-01-01 08:00:00',
            end: '2024-01-01 08:30:00',
            duration: 30,
            route: { points: [] },
          },
        ],
      };

      await healthImportService.importHealthData(jsonData);

      const insertWorkoutCall = (mockRepo.insertWorkout as any).mock.calls[0];
      const workoutData = JSON.parse(insertWorkoutCall[3]);
      expect(workoutData.route).toBeUndefined();
      expect(workoutData.name).toBe('Running');
      expect(workoutData.duration).toBe(30);
    });

    it('should handle nested data structure', async () => {
      const jsonData = {
        data: {
          metrics: {
            step_count: {
              entries: [{ date: '2024-01-01', qty: 10000 }],
              units: 'count',
            },
          },
          workouts: [
            {
              name: 'Running',
              start: '2024-01-01 08:00:00',
              end: '2024-01-01 08:30:00',
              duration: 30,
            },
          ],
        },
      };

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.metrics).toBe(1);
      expect(result.workouts).toBe(1);
    });

    it('should normalize metrics data from array format', async () => {
      const jsonData = {
        metrics: [
          {
            name: 'step_count',
            data: [{ date: '2024-01-01', qty: 10000 }],
            units: 'count',
          },
        ],
      };

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.metrics).toBe(1);
      expect(mockRepo.insertMetricType).toHaveBeenCalledWith(
        'step_count',
        'count',
        expect.any(String)
      );
    });

    it('should skip invalid metric entries', async () => {
      const jsonData = {
        metrics: {
          step_count: {
            entries: [
              { date: '2024-01-01', qty: 10000 },
              { qty: 12000 }, // missing date
              null, // null entry
              'invalid', // invalid type
            ],
            units: 'count',
          },
        },
      } as HealthImportData;

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.metrics).toBe(1);
      expect(mockRepo.insertHealthMetric).toHaveBeenCalledTimes(1);
    });

    it('should skip invalid workout entries', async () => {
      const jsonData = {
        workouts: [
          {
            name: 'Running',
            start: '2024-01-01 08:00:00',
            end: '2024-01-01 08:30:00',
          },
          { name: 'Walking' }, // missing start/end
          { start: '2024-01-01', end: '2024-01-02' }, // missing name
        ],
      } as HealthImportData;

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.workouts).toBe(1);
      expect(mockRepo.insertWorkout).toHaveBeenCalledTimes(1);
    });

    it('should wrap operations in transaction', async () => {
      const jsonData = {
        metrics: {
          step_count: {
            entries: [{ date: '2024-01-01', qty: 10000 }],
            units: 'count',
          },
        },
      };

      await healthImportService.importHealthData(jsonData);

      expect(mockRepo.transaction).toHaveBeenCalled();
    });

    it('should log migration start and completion', async () => {
      const jsonData = {
        metrics: {
          step_count: {
            entries: [{ date: '2024-01-01', qty: 10000 }],
            units: 'count',
          },
        },
      };

      await healthImportService.importHealthData(jsonData);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting health data import');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { metrics: 1, workouts: 0 },
        'Health data import completed'
      );
    });

    it('should update metric type schema if different from first entry', async () => {
      const jsonData = {
        metrics: {
          step_count: {
            entries: [
              { date: '2024-01-01', qty: 10000, source: 'iPhone' },
            ],
            units: 'count',
          },
        },
      };

      await healthImportService.importHealthData(jsonData);

      const schema = JSON.stringify(['date', 'qty', 'source']);
      expect(mockRepo.insertMetricType).toHaveBeenCalledWith('step_count', 'count', schema);
      expect(mockRepo.updateMetricTypeSchema).toHaveBeenCalledWith('step_count', schema);
    });

    it('should handle empty data', async () => {
      const jsonData = { metrics: {}, workouts: [] };

      const result = await healthImportService.importHealthData(jsonData);

      expect(result.metrics).toBe(0);
      expect(result.workouts).toBe(0);
      expect(mockRepo.insertMetricType).not.toHaveBeenCalled();
      expect(mockRepo.insertWorkoutType).not.toHaveBeenCalled();
    });
  });
});

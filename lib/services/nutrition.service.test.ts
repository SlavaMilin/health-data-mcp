import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNutritionService, type NutritionService } from './nutrition.service.ts';
import type { NutritionQueryPort, NutritionDataPort } from '../domain/nutrition.port.ts';
import { MEAL_TYPE, APPLE_SHORTCUT } from '../domain/nutrition.constants.ts';
import type { MealLog } from '../domain/nutrition.ts';

const makeMealLog = (overrides: Partial<MealLog> = {}): MealLog => ({
  id: 1,
  date: '2026-01-25',
  meal_type: MEAL_TYPE.OTHER,
  meal_name: 'Test Meal',
  calories: 500,
  protein: 20,
  fat: 15,
  carbs: 60,
  created_at: '2026-01-25 12:00:00',
  updated_at: '2026-01-25 12:00:00',
  ...overrides,
});

describe('NutritionService', () => {
  let service: NutritionService;
  let mockQueryRepo: NutritionQueryPort;
  let mockDataRepo: NutritionDataPort;

  beforeEach(() => {
    mockQueryRepo = {
      getMealsByDate: vi.fn(() => []),
      getById: vi.fn(),
      getDailyTotals: vi.fn(() => ({ calories: 0, protein: 0, fat: 0, carbs: 0 })),
    };

    mockDataRepo = {
      insertMeal: vi.fn(() => 1),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(() => true),
    };

    service = createNutritionService(mockQueryRepo, mockDataRepo);
  });

  describe('logMeal', () => {
    it('should insert meal and return created meal', () => {
      const createdMeal = makeMealLog();
      mockQueryRepo.getById = vi.fn(() => createdMeal);

      const result = service.logMeal({
        date: '2026-01-25',
        meal_name: 'Test Meal',
        calories: 500,
        protein: 20,
        fat: 15,
        carbs: 60,
      });

      expect(mockDataRepo.insertMeal).toHaveBeenCalled();
      expect(result).toEqual(createdMeal);
    });

    it('should throw if meal cannot be retrieved after insert', () => {
      mockQueryRepo.getById = vi.fn(() => undefined);

      expect(() =>
        service.logMeal({
          date: '2026-01-25',
          meal_name: 'Test',
          calories: 100,
          protein: 5,
          fat: 5,
          carbs: 10,
        }),
      ).toThrow('Failed to retrieve created meal');
    });
  });

  describe('updateMeal', () => {
    it('should throw if meal not found', () => {
      mockQueryRepo.getById = vi.fn(() => undefined);

      expect(() => service.updateMeal(999, { meal_name: 'Updated' })).toThrow('Meal not found: 999');
    });

    it('should merge params with existing meal', () => {
      mockQueryRepo.getById = vi.fn(() => makeMealLog({ meal_name: 'Original', calories: 500 }));

      service.updateMeal(1, { meal_name: 'Updated' });

      expect(mockDataRepo.updateMeal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ meal_name: 'Updated', calories: 500 }),
      );
    });

    it('should update macros when provided', () => {
      mockQueryRepo.getById = vi.fn(() => makeMealLog());

      service.updateMeal(1, { calories: 600, protein: 25 });

      expect(mockDataRepo.updateMeal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ calories: 600, protein: 25, fat: 15, carbs: 60 }),
      );
    });

    it('should update meal_type when provided', () => {
      mockQueryRepo.getById = vi.fn(() => makeMealLog({ meal_type: MEAL_TYPE.OTHER }));

      service.updateMeal(1, { meal_type: MEAL_TYPE.BREAKFAST });

      expect(mockDataRepo.updateMeal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ meal_type: MEAL_TYPE.BREAKFAST }),
      );
    });
  });

  describe('deleteMeal', () => {
    it('should throw if meal not found', () => {
      mockQueryRepo.getById = vi.fn(() => undefined);

      expect(() => service.deleteMeal(999)).toThrow('Meal not found: 999');
    });

    it('should delete meal and return true', () => {
      mockQueryRepo.getById = vi.fn(() => makeMealLog());

      const result = service.deleteMeal(1);

      expect(mockDataRepo.deleteMeal).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
  });

  describe('getDailyPlan', () => {
    it('should return daily plan with meals and totals', () => {
      const meals = [
        makeMealLog({ id: 1, meal_name: 'Breakfast' }),
        makeMealLog({ id: 2, meal_name: 'Lunch' }),
      ];
      const totals = { calories: 1000, protein: 40, fat: 30, carbs: 120 };

      mockQueryRepo.getMealsByDate = vi.fn(() => meals);
      mockQueryRepo.getDailyTotals = vi.fn(() => totals);

      const result = service.getDailyPlan('2026-01-25');

      expect(result.date).toBe('2026-01-25');
      expect(result.meals).toEqual(meals);
      expect(result.totals).toEqual(totals);
    });

    it('should return empty meals array for date with no meals', () => {
      mockQueryRepo.getMealsByDate = vi.fn(() => []);
      mockQueryRepo.getDailyTotals = vi.fn(() => ({ calories: 0, protein: 0, fat: 0, carbs: 0 }));

      const result = service.getDailyPlan('2026-01-20');

      expect(result.meals).toHaveLength(0);
      expect(result.totals.calories).toBe(0);
    });
  });

  describe('generateShortcutUrl', () => {
    it('should generate valid Apple Shortcuts URL', () => {
      const url = service.generateShortcutUrl({
        calories: 2000,
        protein: 100,
        fat: 70,
        carbs: 250,
      });

      expect(url).toContain(APPLE_SHORTCUT.BASE_URL);
      expect(url).toContain(encodeURIComponent(APPLE_SHORTCUT.NAME));
      expect(url).toContain('input=text');
      expect(url).toContain(encodeURIComponent(JSON.stringify({
        calories: 2000,
        protein: 100,
        fat: 70,
        carbs: 250,
      })));
    });

    it('should properly encode special characters', () => {
      const url = service.generateShortcutUrl({
        calories: 1500,
        protein: 75,
        fat: 50,
        carbs: 200,
      });

      expect(url).not.toContain(' ');
      expect(url).not.toContain('{');
      expect(url).not.toContain('}');
    });
  });
});

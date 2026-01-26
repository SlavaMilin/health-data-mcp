import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMcpNutritionHandler, type McpNutritionHandler } from './mcp-nutrition.handler.ts';
import type { NutritionService } from '../services/nutrition.service.ts';
import { MEAL_TYPE } from '../domain/nutrition.constants.ts';
import type { MealLog, DailyMealPlan } from '../domain/nutrition.ts';

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

describe('McpNutritionHandler', () => {
  let handler: McpNutritionHandler;
  let mockService: NutritionService;

  beforeEach(() => {
    mockService = {
      logMeal: vi.fn(() => makeMealLog()),
      updateMeal: vi.fn(() => makeMealLog()),
      deleteMeal: vi.fn(() => true),
      getDailyPlan: vi.fn(() => ({
        date: '2026-01-25',
        meals: [],
        totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      })),
      generateShortcutUrl: vi.fn(() => 'shortcuts://run-shortcut?name=Log%20Daily%20Nutrition&input=text&text=%7B%7D'),
    };

    handler = createMcpNutritionHandler(mockService);
  });

  describe('logMeal', () => {
    it('should return meal with message on success', () => {
      const meal = makeMealLog({ id: 5, meal_name: 'Oatmeal' });
      mockService.logMeal = vi.fn(() => meal);

      const result = handler.logMeal({
        date: '2026-01-25',
        meal_name: 'Oatmeal',
        calories: 300,
        protein: 10,
        fat: 5,
        carbs: 50,
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.id).toBe(5);
      expect(data.message).toBe('Meal logged with ID 5');
      expect(result.isError).toBeUndefined();
    });

    it('should return error on failure', () => {
      mockService.logMeal = vi.fn(() => {
        throw new Error('Failed to log meal');
      });

      const result = handler.logMeal({
        date: '2026-01-25',
        meal_name: 'Test',
        calories: 100,
        protein: 5,
        fat: 5,
        carbs: 10,
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Failed to log meal');
    });
  });

  describe('updateMeal', () => {
    it('should return updated meal with message', () => {
      const updatedMeal = makeMealLog({ id: 1, meal_name: 'Updated Meal' });
      mockService.updateMeal = vi.fn(() => updatedMeal);

      const result = handler.updateMeal({ id: 1, meal_name: 'Updated Meal' });
      const data = JSON.parse(result.content[0].text);

      expect(data.meal_name).toBe('Updated Meal');
      expect(data.message).toBe('Meal 1 updated');
    });

    it('should return error if meal not found', () => {
      mockService.updateMeal = vi.fn(() => {
        throw new Error('Meal not found: 999');
      });

      const result = handler.updateMeal({ id: 999, meal_name: 'Updated' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Meal not found: 999');
    });
  });

  describe('deleteMeal', () => {
    it('should return success message', () => {
      const result = handler.deleteMeal({ id: 1 });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      expect(data.message).toBe('Meal 1 deleted');
    });

    it('should return error if meal not found', () => {
      mockService.deleteMeal = vi.fn(() => {
        throw new Error('Meal not found: 999');
      });

      const result = handler.deleteMeal({ id: 999 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Meal not found: 999');
    });
  });

  describe('getDailyPlan', () => {
    it('should return daily plan with meals and totals', () => {
      const plan: DailyMealPlan = {
        date: '2026-01-25',
        meals: [makeMealLog({ id: 1 }), makeMealLog({ id: 2 })],
        totals: { calories: 1000, protein: 40, fat: 30, carbs: 120 },
      };
      mockService.getDailyPlan = vi.fn(() => plan);

      const result = handler.getDailyPlan({ date: '2026-01-25' });
      const data = JSON.parse(result.content[0].text);

      expect(data.date).toBe('2026-01-25');
      expect(data.meals).toHaveLength(2);
      expect(data.totals.calories).toBe(1000);
    });

    it('should return error on failure', () => {
      mockService.getDailyPlan = vi.fn(() => {
        throw new Error('Database error');
      });

      const result = handler.getDailyPlan({ date: '2026-01-25' });

      expect(result.isError).toBe(true);
    });
  });

  describe('generateShortcutUrl', () => {
    it('should return URL with message', () => {
      const url = 'shortcuts://run-shortcut?name=Log%20Daily%20Nutrition&input=text&text=%7B%22calories%22%3A2000%7D';
      mockService.generateShortcutUrl = vi.fn(() => url);

      const result = handler.generateShortcutUrl({
        calories: 2000,
        protein: 100,
        fat: 70,
        carbs: 250,
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.url).toBe(url);
      expect(data.message).toBe('Apple Shortcut URL generated');
    });

    it('should return error on failure', () => {
      mockService.generateShortcutUrl = vi.fn(() => {
        throw new Error('Failed to generate URL');
      });

      const result = handler.generateShortcutUrl({
        calories: 2000,
        protein: 100,
        fat: 70,
        carbs: 250,
      });

      expect(result.isError).toBe(true);
    });
  });
});

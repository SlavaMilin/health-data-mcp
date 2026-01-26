import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createNutritionQueryRepository } from './nutrition-query.repository.ts';
import { runMigrations } from '../infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';
import { MEAL_TYPE } from '../domain/nutrition.constants.ts';
import type { NutritionQueryPort } from '../domain/nutrition.port.ts';

describe('NutritionQueryRepository', () => {
  let db: Database.Database;
  let repo: NutritionQueryPort;

  const insertMeal = (data: {
    date: string;
    meal_type?: string;
    meal_name: string;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO meal_logs (date, meal_type, meal_name, calories, protein, fat, carbs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.date,
      data.meal_type ?? MEAL_TYPE.OTHER,
      data.meal_name,
      data.calories ?? 0,
      data.protein ?? 0,
      data.fat ?? 0,
      data.carbs ?? 0,
    );
    return Number(result.lastInsertRowid);
  };

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    await runMigrations(db, MIGRATIONS_DIR);
    repo = createNutritionQueryRepository(db);
  });

  describe('getById', () => {
    it('should return meal by id', () => {
      const id = insertMeal({ date: '2026-01-25', meal_name: 'Oatmeal' });
      const meal = repo.getById(id);
      expect(meal?.meal_name).toBe('Oatmeal');
    });

    it('should return undefined for non-existent id', () => {
      expect(repo.getById(999)).toBeUndefined();
    });
  });

  describe('getMealsByDate', () => {
    beforeEach(() => {
      insertMeal({ date: '2026-01-25', meal_type: MEAL_TYPE.BREAKFAST, meal_name: 'Oatmeal' });
      insertMeal({ date: '2026-01-25', meal_type: MEAL_TYPE.LUNCH, meal_name: 'Salad' });
      insertMeal({ date: '2026-01-25', meal_type: MEAL_TYPE.DINNER, meal_name: 'Chicken' });
      insertMeal({ date: '2026-01-26', meal_type: MEAL_TYPE.BREAKFAST, meal_name: 'Eggs' });
    });

    it('should return meals for specified date', () => {
      const meals = repo.getMealsByDate('2026-01-25');
      expect(meals).toHaveLength(3);
    });

    it('should return empty array for date with no meals', () => {
      const meals = repo.getMealsByDate('2026-01-20');
      expect(meals).toHaveLength(0);
    });

    it('should order by meal type (breakfast, lunch, dinner, snack, other)', () => {
      insertMeal({ date: '2026-01-25', meal_type: MEAL_TYPE.SNACK, meal_name: 'Apple' });
      const meals = repo.getMealsByDate('2026-01-25');
      expect(meals[0].meal_type).toBe(MEAL_TYPE.BREAKFAST);
      expect(meals[1].meal_type).toBe(MEAL_TYPE.LUNCH);
      expect(meals[2].meal_type).toBe(MEAL_TYPE.DINNER);
      expect(meals[3].meal_type).toBe(MEAL_TYPE.SNACK);
    });
  });

  describe('getDailyTotals', () => {
    it('should sum macros for date', () => {
      insertMeal({
        date: '2026-01-25',
        meal_name: 'Meal 1',
        calories: 500,
        protein: 20,
        fat: 15,
        carbs: 60,
      });
      insertMeal({
        date: '2026-01-25',
        meal_name: 'Meal 2',
        calories: 300,
        protein: 10,
        fat: 10,
        carbs: 40,
      });

      const totals = repo.getDailyTotals('2026-01-25');
      expect(totals.calories).toBe(800);
      expect(totals.protein).toBe(30);
      expect(totals.fat).toBe(25);
      expect(totals.carbs).toBe(100);
    });

    it('should return zeros for date with no meals', () => {
      const totals = repo.getDailyTotals('2026-01-20');
      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
      expect(totals.fat).toBe(0);
      expect(totals.carbs).toBe(0);
    });
  });
});

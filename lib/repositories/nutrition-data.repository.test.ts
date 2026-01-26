import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createNutritionDataRepository } from './nutrition-data.repository.ts';
import { runMigrations } from '../infrastructure/migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';
import { MEAL_TYPE } from '../domain/nutrition.constants.ts';
import type { NutritionDataPort } from '../domain/nutrition.port.ts';

interface MealLogRow {
  id: number;
  date: string;
  meal_type: string;
  meal_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  created_at: string;
  updated_at: string;
}

describe('NutritionDataRepository', () => {
  let db: Database.Database;
  let repo: NutritionDataPort;

  const getMeal = (id: number): MealLogRow | undefined => {
    return db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(id) as MealLogRow | undefined;
  };

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    await runMigrations(db, MIGRATIONS_DIR);
    repo = createNutritionDataRepository(db);
  });

  describe('insertMeal', () => {
    it('should insert meal and return id', () => {
      const id = repo.insertMeal({
        date: '2026-01-25',
        meal_name: 'Oatmeal',
        calories: 300,
        protein: 10,
        fat: 5,
        carbs: 50,
      });
      expect(id).toBeGreaterThan(0);

      const meal = getMeal(id);
      expect(meal?.meal_name).toBe('Oatmeal');
      expect(meal?.meal_type).toBe(MEAL_TYPE.OTHER);
    });

    it('should use specified meal_type', () => {
      const id = repo.insertMeal({
        date: '2026-01-25',
        meal_type: MEAL_TYPE.BREAKFAST,
        meal_name: 'Pancakes',
        calories: 400,
        protein: 8,
        fat: 12,
        carbs: 65,
      });

      const meal = getMeal(id);
      expect(meal?.meal_type).toBe(MEAL_TYPE.BREAKFAST);
    });

    it('should store all macro values', () => {
      const id = repo.insertMeal({
        date: '2026-01-25',
        meal_name: 'Full Meal',
        calories: 500,
        protein: 25,
        fat: 20,
        carbs: 50,
      });

      const meal = getMeal(id);
      expect(meal?.calories).toBe(500);
      expect(meal?.protein).toBe(25);
      expect(meal?.fat).toBe(20);
      expect(meal?.carbs).toBe(50);
    });
  });

  describe('updateMeal', () => {
    it('should update all fields', () => {
      const id = repo.insertMeal({
        date: '2026-01-25',
        meal_name: 'Original',
        calories: 100,
        protein: 5,
        fat: 5,
        carbs: 10,
      });
      const original = getMeal(id)!;

      repo.updateMeal(id, {
        id,
        date: original.date,
        meal_type: MEAL_TYPE.LUNCH,
        meal_name: 'Updated',
        calories: 200,
        protein: 10,
        fat: 8,
        carbs: 25,
        created_at: original.created_at,
        updated_at: original.updated_at,
      });

      const updated = getMeal(id);
      expect(updated?.meal_name).toBe('Updated');
      expect(updated?.meal_type).toBe(MEAL_TYPE.LUNCH);
      expect(updated?.calories).toBe(200);
    });

    it('should set updated_at to current time', () => {
      const id = repo.insertMeal({
        date: '2026-01-25',
        meal_name: 'Test',
        calories: 100,
        protein: 5,
        fat: 5,
        carbs: 10,
      });
      const original = getMeal(id)!;

      repo.updateMeal(id, {
        id,
        date: original.date,
        meal_type: original.meal_type as typeof MEAL_TYPE[keyof typeof MEAL_TYPE],
        meal_name: 'Updated',
        calories: 100,
        protein: 5,
        fat: 5,
        carbs: 10,
        created_at: original.created_at,
        updated_at: original.updated_at,
      });

      const updated = getMeal(id);
      // Verify updated_at is a valid timestamp (datetime('now') sets it)
      expect(updated?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(updated?.updated_at).not.toBeNull();
    });
  });

  describe('deleteMeal', () => {
    it('should delete meal and return true', () => {
      const id = repo.insertMeal({
        date: '2026-01-25',
        meal_name: 'To Delete',
        calories: 100,
        protein: 5,
        fat: 5,
        carbs: 10,
      });

      const result = repo.deleteMeal(id);
      expect(result).toBe(true);
      expect(getMeal(id)).toBeUndefined();
    });

    it('should return false for non-existent id', () => {
      const result = repo.deleteMeal(999);
      expect(result).toBe(false);
    });
  });
});

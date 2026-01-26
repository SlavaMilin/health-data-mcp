import type Database from 'better-sqlite3';
import type { LogMealParams, MealLog } from '../domain/nutrition.ts';
import type { NutritionDataPort } from '../domain/nutrition.port.ts';
import { MEAL_TYPE } from '../domain/nutrition.constants.ts';

export const createNutritionDataRepository = (db: Database.Database): NutritionDataPort => {
  const insertStmt = db.prepare(`
    INSERT INTO meal_logs (date, meal_type, meal_name, calories, protein, fat, carbs)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE meal_logs SET
      meal_type = ?, meal_name = ?, calories = ?, protein = ?,
      fat = ?, carbs = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const deleteStmt = db.prepare('DELETE FROM meal_logs WHERE id = ?');

  return {
    insertMeal: (params) => {
      const result = insertStmt.run(
        params.date,
        params.meal_type ?? MEAL_TYPE.OTHER,
        params.meal_name,
        params.calories,
        params.protein,
        params.fat,
        params.carbs,
      );
      return Number(result.lastInsertRowid);
    },

    updateMeal: (id, meal) => {
      updateStmt.run(
        meal.meal_type,
        meal.meal_name,
        meal.calories,
        meal.protein,
        meal.fat,
        meal.carbs,
        id,
      );
    },

    deleteMeal: (id) => {
      const result = deleteStmt.run(id);
      return result.changes > 0;
    },
  };
};

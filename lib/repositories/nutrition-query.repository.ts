import type Database from 'better-sqlite3';
import type { MealLog, MealType, Macros } from '../domain/nutrition.ts';
import type { NutritionQueryPort } from '../domain/nutrition.port.ts';
import { MEAL_TYPE } from '../domain/nutrition.constants.ts';

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

interface TotalsRow {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

const rowToMealLog = (row: MealLogRow): MealLog => ({
  id: row.id,
  date: row.date,
  meal_type: row.meal_type as MealType,
  meal_name: row.meal_name,
  calories: row.calories,
  protein: row.protein,
  fat: row.fat,
  carbs: row.carbs,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const createNutritionQueryRepository = (db: Database.Database): NutritionQueryPort => {
  const getMealsByDateStmt = db.prepare<[string], MealLogRow>(`
    SELECT * FROM meal_logs WHERE date = ?
    ORDER BY
      CASE meal_type
        WHEN '${MEAL_TYPE.BREAKFAST}' THEN 1
        WHEN '${MEAL_TYPE.LUNCH}' THEN 2
        WHEN '${MEAL_TYPE.DINNER}' THEN 3
        WHEN '${MEAL_TYPE.SNACK}' THEN 4
        ELSE 5
      END,
      created_at
  `);

  const getByIdStmt = db.prepare<[number], MealLogRow>('SELECT * FROM meal_logs WHERE id = ?');

  const getDailyTotalsStmt = db.prepare<[string], TotalsRow>(`
    SELECT
      SUM(calories) as calories,
      SUM(protein) as protein,
      SUM(fat) as fat,
      SUM(carbs) as carbs
    FROM meal_logs WHERE date = ?
  `);

  return {
    getMealsByDate: (date) => {
      const rows = getMealsByDateStmt.all(date);
      return rows.map(rowToMealLog);
    },

    getById: (id) => {
      const row = getByIdStmt.get(id);
      return row ? rowToMealLog(row) : undefined;
    },

    getDailyTotals: (date) => {
      const row = getDailyTotalsStmt.get(date);
      return {
        calories: row?.calories ?? 0,
        protein: row?.protein ?? 0,
        fat: row?.fat ?? 0,
        carbs: row?.carbs ?? 0,
      };
    },
  };
};

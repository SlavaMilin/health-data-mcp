import type { MealLog, LogMealParams, Macros } from './nutrition.ts';

export interface NutritionQueryPort {
  getMealsByDate: (date: string) => MealLog[];
  getById: (id: number) => MealLog | undefined;
  getDailyTotals: (date: string) => Macros;
}

export interface NutritionDataPort {
  insertMeal: (params: LogMealParams) => number;
  updateMeal: (id: number, meal: MealLog) => void;
  deleteMeal: (id: number) => boolean;
}

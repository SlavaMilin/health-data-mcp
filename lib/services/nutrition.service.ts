import type { NutritionQueryPort, NutritionDataPort } from '../domain/nutrition.port.ts';
import type {
  MealLog,
  LogMealParams,
  UpdateMealParams,
  DailyMealPlan,
  Macros,
} from '../domain/nutrition.ts';
import { APPLE_SHORTCUT } from '../domain/nutrition.constants.ts';

export interface NutritionService {
  logMeal: (params: LogMealParams) => MealLog;
  updateMeal: (id: number, params: UpdateMealParams) => MealLog;
  deleteMeal: (id: number) => boolean;
  getDailyPlan: (date: string) => DailyMealPlan;
  generateShortcutUrl: (macros: Macros) => string;
}

export const createNutritionService = (
  queryRepo: NutritionQueryPort,
  dataRepo: NutritionDataPort,
): NutritionService => {
  return {
    logMeal: (params) => {
      const id = dataRepo.insertMeal(params);
      const meal = queryRepo.getById(id);
      if (!meal) {
        throw new Error('Failed to retrieve created meal');
      }
      return meal;
    },

    updateMeal: (id, params) => {
      const existing = queryRepo.getById(id);
      if (!existing) {
        throw new Error(`Meal not found: ${id}`);
      }

      const updated: MealLog = {
        ...existing,
        meal_type: params.meal_type ?? existing.meal_type,
        meal_name: params.meal_name ?? existing.meal_name,
        calories: params.calories ?? existing.calories,
        protein: params.protein ?? existing.protein,
        fat: params.fat ?? existing.fat,
        carbs: params.carbs ?? existing.carbs,
      };

      dataRepo.updateMeal(id, updated);
      return queryRepo.getById(id)!;
    },

    deleteMeal: (id) => {
      const existing = queryRepo.getById(id);
      if (!existing) {
        throw new Error(`Meal not found: ${id}`);
      }
      return dataRepo.deleteMeal(id);
    },

    getDailyPlan: (date) => {
      const meals = queryRepo.getMealsByDate(date);
      const totals = queryRepo.getDailyTotals(date);
      return { date, meals, totals };
    },

    generateShortcutUrl: (macros) => {
      const input = JSON.stringify({
        calories: macros.calories,
        protein: macros.protein,
        fat: macros.fat,
        carbs: macros.carbs,
      });
      const encodedName = encodeURIComponent(APPLE_SHORTCUT.NAME);
      const encodedInput = encodeURIComponent(input);
      return `${APPLE_SHORTCUT.BASE_URL}?name=${encodedName}&input=text&text=${encodedInput}`;
    },
  };
};

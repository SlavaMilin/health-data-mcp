import type { MEAL_TYPE } from './nutrition.constants.ts';

export type MealType = (typeof MEAL_TYPE)[keyof typeof MEAL_TYPE];

export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealLog extends Macros {
  id: number;
  date: string;
  meal_type: MealType;
  meal_name: string;
  created_at: string;
  updated_at: string;
}

export interface LogMealParams extends Macros {
  date: string;
  meal_type?: MealType;
  meal_name: string;
}

export interface UpdateMealParams {
  meal_type?: MealType;
  meal_name?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export interface DailyMealPlan {
  date: string;
  meals: MealLog[];
  totals: Macros;
}

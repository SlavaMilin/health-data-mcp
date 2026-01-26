import { z } from 'zod';
import { MEAL_TYPE } from '../domain/nutrition.constants.ts';

type MealTypeValue = (typeof MEAL_TYPE)[keyof typeof MEAL_TYPE];

const mealTypeValues = Object.values(MEAL_TYPE) as [MealTypeValue, ...MealTypeValue[]];

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format');

const macrosSchema = {
  calories: z.number().min(0).describe('Total calories'),
  protein: z.number().min(0).describe('Protein in grams'),
  fat: z.number().min(0).describe('Fat in grams'),
  carbs: z.number().min(0).describe('Carbohydrates in grams'),
};

export const logMealSchema = {
  title: 'Log Meal',
  description: `Add a meal to the nutrition diary.

Each entry is a single food item or dish. You can log multiple items for the same meal type.
For example, log "Oatmeal" and "Banana" separately for breakfast.

The meal_type field categorizes when the food was eaten (breakfast, lunch, dinner, snack, other).
If meal_type is not specified, it defaults to "other".`,
  inputSchema: z.object({
    date: dateSchema.describe('Date of the meal (YYYY-MM-DD)'),
    meal_type: z.enum(mealTypeValues).optional().describe('Type of meal: breakfast, lunch, dinner, snack, other'),
    meal_name: z.string().min(1).describe('Name of the food or dish'),
    ...macrosSchema,
  }),
};

export const updateMealSchema = {
  title: 'Update Meal',
  description: `Update an existing meal entry by ID.

Only provided fields will be updated. Use get_daily_meal_plan to see meal IDs.`,
  inputSchema: z.object({
    id: z.number().describe('Meal ID to update'),
    meal_type: z.enum(mealTypeValues).optional().describe('Type of meal: breakfast, lunch, dinner, snack, other'),
    meal_name: z.string().min(1).optional().describe('Name of the food or dish'),
    calories: z.number().min(0).optional().describe('Total calories'),
    protein: z.number().min(0).optional().describe('Protein in grams'),
    fat: z.number().min(0).optional().describe('Fat in grams'),
    carbs: z.number().min(0).optional().describe('Carbohydrates in grams'),
  }),
};

export const deleteMealSchema = {
  title: 'Delete Meal',
  description: `Delete a meal entry by ID.

Use get_daily_meal_plan to see meal IDs before deleting.`,
  inputSchema: z.object({
    id: z.number().describe('Meal ID to delete'),
  }),
};

export const getDailyMealPlanSchema = {
  title: 'Get Daily Meal Plan',
  description: `Get all meals for a specific date with daily totals.

Returns:
- List of all meals with their IDs (for editing/deleting)
- Daily totals for calories, protein, fat, and carbs

Meals are ordered by type: breakfast → lunch → dinner → snack → other.`,
  inputSchema: z.object({
    date: dateSchema.describe('Date to get meals for (YYYY-MM-DD)'),
  }),
};

export const generateAppleShortcutUrlSchema = {
  title: 'Generate Apple Shortcut URL',
  description: `Generate a URL to trigger an Apple Shortcut with daily nutrition totals.

The URL opens the "Log Daily Nutrition" shortcut with the provided macros as JSON input.
Use this after calculating daily totals to log them to Apple Health via Shortcuts.`,
  inputSchema: z.object({
    ...macrosSchema,
  }),
};

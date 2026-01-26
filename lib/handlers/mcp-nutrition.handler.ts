import type { NutritionService } from '../services/nutrition.service.ts';
import type { McpToolResponse } from '../types/mcp.types.ts';
import type { LogMealParams, UpdateMealParams, Macros } from '../domain/nutrition.ts';

export interface McpNutritionHandler {
  logMeal: (args: LogMealParams) => McpToolResponse;
  updateMeal: (args: { id: number } & UpdateMealParams) => McpToolResponse;
  deleteMeal: (args: { id: number }) => McpToolResponse;
  getDailyPlan: (args: { date: string }) => McpToolResponse;
  generateShortcutUrl: (args: Macros) => McpToolResponse;
}

const textResponse = (data: unknown): McpToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});

const errorResponse = (error: string): McpToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify({ error }, null, 2) }],
  isError: true,
});

export const createMcpNutritionHandler = (nutritionService: NutritionService): McpNutritionHandler => {
  return {
    logMeal: (args) => {
      try {
        const meal = nutritionService.logMeal(args);
        return textResponse({ ...meal, message: `Meal logged with ID ${meal.id}` });
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    updateMeal: (args) => {
      try {
        const { id, ...params } = args;
        const meal = nutritionService.updateMeal(id, params);
        return textResponse({ ...meal, message: `Meal ${id} updated` });
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    deleteMeal: (args) => {
      try {
        nutritionService.deleteMeal(args.id);
        return textResponse({ success: true, message: `Meal ${args.id} deleted` });
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    getDailyPlan: (args) => {
      try {
        const plan = nutritionService.getDailyPlan(args.date);
        return textResponse(plan);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    generateShortcutUrl: (args) => {
      try {
        const url = nutritionService.generateShortcutUrl(args);
        return textResponse({ url, message: 'Apple Shortcut URL generated' });
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },
  };
};

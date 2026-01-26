import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpNutritionHandler } from '../handlers/mcp-nutrition.handler.ts';
import {
  logMealSchema,
  updateMealSchema,
  deleteMealSchema,
  getDailyMealPlanSchema,
  generateAppleShortcutUrlSchema,
} from '../schemas/nutrition.schemas.ts';

export const registerMcpNutritionTools = (server: McpServer, handler: McpNutritionHandler) => {
  server.registerTool('log_meal', logMealSchema, async (args) => handler.logMeal(args));
  server.registerTool('update_meal', updateMealSchema, async (args) => handler.updateMeal(args));
  server.registerTool('delete_meal', deleteMealSchema, async (args) => handler.deleteMeal(args));
  server.registerTool('get_daily_meal_plan', getDailyMealPlanSchema, async (args) => handler.getDailyPlan(args));
  server.registerTool('generate_apple_shortcut_url', generateAppleShortcutUrlSchema, async (args) => handler.generateShortcutUrl(args));
};

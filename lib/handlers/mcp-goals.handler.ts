import type { GoalsService } from '../services/goals.service.ts';
import type { McpToolResponse } from '../types/health-query.types.ts';
import type { CreateGoalParams, UpdateGoalParams, ListGoalsFilter, Goal } from '../types/goals.types.ts';

export interface McpGoalsHandler {
  create: (args: CreateGoalParams) => McpToolResponse;
  update: (args: { id: number } & UpdateGoalParams) => McpToolResponse;
  list: (args: ListGoalsFilter) => McpToolResponse;
  get: (args: { id: number }) => McpToolResponse;
  getActiveGoals: () => Goal[];
}

const textResponse = (data: unknown): McpToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});

const errorResponse = (error: string): McpToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify({ error }, null, 2) }],
  isError: true,
});

export const createMcpGoalsHandler = (goalsService: GoalsService): McpGoalsHandler => {
  return {
    create: (args) => {
      try {
        const id = goalsService.create(args);
        const goal = goalsService.getById(id);
        return textResponse({ ...goal, message: `Goal created with ID ${id}` });
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    update: (args) => {
      try {
        const { id, ...params } = args;
        const goal = goalsService.update(id, params);
        return textResponse(goal);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    list: (args) => {
      try {
        const goals = goalsService.list(args);
        return textResponse(goals);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    get: (args) => {
      try {
        const goal = goalsService.getById(args.id);
        if (!goal) {
          return errorResponse(`Goal not found: ${args.id}`);
        }
        return textResponse(goal);
      } catch (error) {
        return errorResponse((error as Error).message);
      }
    },

    getActiveGoals: () => goalsService.list({ status: 'active' }),
  };
};

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpGoalsHandler } from '../handlers/mcp-goals.handler.ts';
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalsSchema,
  getGoalSchema,
} from '../schemas/goals.schemas.ts';

export const registerMcpGoalsTools = (server: McpServer, handler: McpGoalsHandler) => {
  server.registerTool('create_goal', createGoalSchema, async (args) => handler.create(args));
  server.registerTool('update_goal', updateGoalSchema, async (args) => handler.update(args));
  server.registerTool('list_goals', listGoalsSchema, async (args) => handler.list(args));
  server.registerTool('get_goal', getGoalSchema, async (args) => handler.get(args));
};

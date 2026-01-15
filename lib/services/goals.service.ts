import type { GoalsQueryRepository } from '../repositories/goals-query.repository.ts';
import type { GoalsDataRepository } from '../repositories/goals-data.repository.ts';
import type {
  Goal,
  GoalRow,
  GoalStatus,
  GoalPeriod,
  CreateGoalParams,
  UpdateGoalParams,
  ListGoalsFilter,
} from '../types/goals.types.ts';

export interface GoalsService {
  create: (params: CreateGoalParams) => number;
  update: (id: number, params: UpdateGoalParams) => Goal;
  list: (filter?: ListGoalsFilter) => Goal[];
  getById: (id: number) => Goal | null;
  getPrimary: () => Goal | null;
}

const rowToGoal = (row: GoalRow): Goal => ({
  id: row.id,
  title: row.title,
  description: row.description,
  deadline: row.deadline,
  period: row.period as GoalPeriod | null,
  status: row.status as GoalStatus,
  is_primary: row.is_primary === 1,
  metrics: row.metrics ? JSON.parse(row.metrics) : [],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const createGoalsService = (
  queryRepo: GoalsQueryRepository,
  dataRepo: GoalsDataRepository,
): GoalsService => {
  return {
    create: (params) => {
      if (params.is_primary) {
        return dataRepo.transaction(() => {
          dataRepo.clearPrimary();
          return dataRepo.create(params);
        });
      }
      return dataRepo.create(params);
    },

    update: (id, params) => {
      const existing = queryRepo.getById(id);
      if (!existing) {
        throw new Error(`Goal not found: ${id}`);
      }

      const goal = rowToGoal(existing);
      const updated: Goal = {
        ...goal,
        title: params.title ?? goal.title,
        description: params.description !== undefined ? params.description : goal.description,
        deadline: params.deadline !== undefined ? params.deadline : goal.deadline,
        period: params.period !== undefined ? params.period : goal.period,
        status: params.status ?? goal.status,
        is_primary: params.is_primary ?? goal.is_primary,
        metrics: params.metrics ?? goal.metrics,
      };

      if (params.is_primary && !goal.is_primary) {
        dataRepo.transaction(() => {
          dataRepo.clearPrimary();
          dataRepo.update(updated);
        });
      } else {
        dataRepo.update(updated);
      }

      // Re-fetch to get fresh updated_at from DB
      const freshRow = queryRepo.getById(id);
      return rowToGoal(freshRow!);
    },

    list: (filter) => {
      const rows = queryRepo.list(filter?.status);
      return rows.map(rowToGoal);
    },

    getById: (id) => {
      const row = queryRepo.getById(id);
      return row ? rowToGoal(row) : null;
    },

    getPrimary: () => {
      const row = queryRepo.getPrimary();
      return row ? rowToGoal(row) : null;
    },
  };
};

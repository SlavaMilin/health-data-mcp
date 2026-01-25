import type { GoalsQueryRepository } from '../repositories/goals-query.repository.ts';
import type { GoalsDataRepository } from '../repositories/goals-data.repository.ts';
import type {
  Goal,
  CreateGoalParams,
  UpdateGoalParams,
  ListGoalsFilter,
} from '../domain/goals.ts';

export interface GoalsService {
  create: (params: CreateGoalParams) => number;
  update: (id: number, params: UpdateGoalParams) => Goal;
  list: (filter?: ListGoalsFilter) => Goal[];
  getById: (id: number) => Goal | null;
  getPrimary: () => Goal | null;
}

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
      const goal = queryRepo.getById(id);
      if (!goal) {
        throw new Error(`Goal not found: ${id}`);
      }

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

      return queryRepo.getById(id)!;
    },

    list: (filter) => queryRepo.list(filter?.status),

    getById: (id) => queryRepo.getById(id) ?? null,

    getPrimary: () => queryRepo.getPrimary() ?? null,
  };
};

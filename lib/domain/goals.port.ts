import type { Goal, GoalStatus, CreateGoalParams } from './goals.ts';

export interface GoalsQueryPort {
  getById: (id: number) => Goal | undefined;
  list: (status?: GoalStatus | 'all') => Goal[];
  getPrimary: () => Goal | undefined;
}

export interface GoalsDataPort {
  create: (params: CreateGoalParams) => number;
  update: (goal: Goal) => void;
  clearPrimary: () => void;
  transaction: <T>(fn: () => T) => T;
}

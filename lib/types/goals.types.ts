import type { GOAL_STATUS, GOAL_PERIOD, METRIC_DIRECTION } from '../constants/goals.constants.ts';

export type GoalStatus = (typeof GOAL_STATUS)[keyof typeof GOAL_STATUS];
export type GoalPeriod = (typeof GOAL_PERIOD)[keyof typeof GOAL_PERIOD];
export type MetricDirection = (typeof METRIC_DIRECTION)[keyof typeof METRIC_DIRECTION];

export interface GoalRow {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  period: string | null;
  metrics: string | null;
  status: string;
  is_primary: number;
  created_at: string;
  updated_at: string;
}

export interface GoalMetric {
  metric_name: string;
  target: number;
  direction?: MetricDirection;
  baseline?: number;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  period: GoalPeriod | null;
  status: GoalStatus;
  is_primary: boolean;
  metrics: GoalMetric[];
  created_at: string;
  updated_at: string;
}

export interface CreateGoalParams {
  title: string;
  description?: string | null;
  deadline?: string | null;
  period?: GoalPeriod | null;
  metrics?: GoalMetric[];
  status?: GoalStatus;
  is_primary?: boolean;
}

export interface UpdateGoalParams {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  period?: GoalPeriod | null;
  metrics?: GoalMetric[];
  status?: GoalStatus;
  is_primary?: boolean;
}

export interface ListGoalsFilter {
  status?: GoalStatus | 'all';
}

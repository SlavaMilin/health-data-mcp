export const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export const GOAL_PERIOD = {
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
} as const;

export const METRIC_DIRECTION = {
  INCREASE: 'increase',
  DECREASE: 'decrease',
} as const;

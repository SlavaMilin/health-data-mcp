import { z } from 'zod';
import { GOAL_STATUS, GOAL_PERIOD, METRIC_DIRECTION } from '../domain/goals.constants.ts';

type GoalStatusValue = (typeof GOAL_STATUS)[keyof typeof GOAL_STATUS];
type GoalPeriodValue = (typeof GOAL_PERIOD)[keyof typeof GOAL_PERIOD];
type MetricDirectionValue = (typeof METRIC_DIRECTION)[keyof typeof METRIC_DIRECTION];

const goalStatusValues = Object.values(GOAL_STATUS) as [GoalStatusValue, ...GoalStatusValue[]];
const goalPeriodValues = Object.values(GOAL_PERIOD) as [GoalPeriodValue, ...GoalPeriodValue[]];
const metricDirectionValues = Object.values(METRIC_DIRECTION) as [MetricDirectionValue, ...MetricDirectionValue[]];
const listFilterValues = [...goalStatusValues, 'all'] as const;

const goalMetricSchema = z.object({
  metric_name: z.string().describe('Health metric name (use list_metric_types to see available)'),
  target: z.number().describe('Target value'),
  direction: z.enum(metricDirectionValues).optional(),
  baseline: z.number().optional().describe('Starting value'),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createGoalSchema = {
  title: 'Create Goal',
  description: `Create a health goal with optional metric targets.

Goals can be:
- Metric-based: bind to health metrics with specific targets
- Free-form: AI interprets progress from description

Use list_metric_types to see available metrics for binding.
Set is_primary=true to mark as main focus goal (only one can be primary).
period hints time window for progress calculation (week/month/year).`,
  inputSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional().describe('Free-form goal description for AI to interpret'),
    deadline: dateSchema.optional().describe('Target completion date'),
    period: z.enum(goalPeriodValues).optional().describe('Time window hint for progress calculation'),
    metrics: z.array(goalMetricSchema).optional().describe('Metric targets to track'),
    is_primary: z.boolean().default(false).describe('Mark as main focus goal'),
  }),
};

export const updateGoalSchema = {
  title: 'Update Goal',
  description: `Update goal fields. Only provided fields are updated.

To mark goal as done: status='completed'
To archive/delete goal: status='archived'
To change main focus: is_primary=true (clears previous primary)

Note: metrics replaces the entire array, not merged with existing.`,
  inputSchema: z.object({
    id: z.number(),
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    deadline: dateSchema.nullable().optional(),
    period: z.enum(goalPeriodValues).nullable().optional(),
    metrics: z.array(goalMetricSchema).optional(),
    status: z.enum(goalStatusValues).optional().describe('active | completed | archived'),
    is_primary: z.boolean().optional(),
  }),
};

export const listGoalsSchema = {
  title: 'List Goals',
  description: `List health goals with progress tracking info.

Each goal may have metrics[] with targets. To check progress:
1. Read goal's metrics[].metric_name and metrics[].target
2. Use query_metrics or execute_sql to get current value
3. Compare current vs target (considering direction: increase/decrease)

period field hints time window for progress (week/month/year).
is_primary=true marks the main focus goal.`,
  inputSchema: z.object({
    status: z.enum(listFilterValues).default(GOAL_STATUS.ACTIVE).describe('Filter: active | completed | archived | all'),
  }),
};

export const getGoalSchema = {
  title: 'Get Goal',
  description: 'Get single goal by ID with full details including metrics targets.',
  inputSchema: z.object({
    id: z.number(),
  }),
};

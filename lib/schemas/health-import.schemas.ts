import { z } from "zod";

export const healthMetricEntrySchema = z.object({
  date: z.string(),
}).passthrough();

export const healthMetricDataSchema = z.object({
  entries: z.array(healthMetricEntrySchema).optional(),
  units: z.string().optional(),
}).passthrough();

export const healthMetricArrayItemSchema = z.object({
  name: z.string(),
  data: z.array(healthMetricEntrySchema),
  units: z.string().optional(),
});

export const workoutEntrySchema = z.object({
  name: z.string(),
  start: z.string(),
  end: z.string(),
}).passthrough();

const metricsSchema = z.record(z.string(), healthMetricDataSchema).or(z.array(healthMetricArrayItemSchema));

export const healthImportSchema = z.object({
  data: z.object({
    metrics: metricsSchema.optional(),
    workouts: z.array(workoutEntrySchema).optional(),
  }).optional(),
  metrics: metricsSchema.optional(),
  workouts: z.array(workoutEntrySchema).optional(),
});

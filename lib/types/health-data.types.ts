import type { z } from "zod";
import type {
  healthImportSchema,
  healthMetricEntrySchema,
  healthMetricDataSchema,
  workoutEntrySchema,
} from "../schemas/health-import.schemas.ts";

export interface MetricTypeRow {
  id: number;
  name: string;
  unit: string;
  schema: string | null;
}

export interface HealthMetricRow {
  id: number;
  type_id: number;
  date: string;
  data: string;
}

export interface WorkoutTypeRow {
  id: number;
  name: string;
  schema: string | null;
}

export interface WorkoutRow {
  id: number;
  type_id: number;
  start_date: string;
  end_date: string;
  data: string;
}

export interface CountRow {
  count: number;
}

export interface IdRow {
  id: number;
}

export interface HealthImportResult {
  metrics: number;
  workouts: number;
}

export type HealthImportData = z.infer<typeof healthImportSchema>;
export type HealthMetricEntry = z.infer<typeof healthMetricEntrySchema>;
export type HealthMetricData = z.infer<typeof healthMetricDataSchema>;
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;

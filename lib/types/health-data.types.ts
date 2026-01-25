import type { z } from "zod";
import type {
  healthImportSchema,
  healthMetricEntrySchema,
  healthMetricDataSchema,
  workoutEntrySchema,
} from "../schemas/health-import.schemas.ts";

export type HealthImportData = z.infer<typeof healthImportSchema>;
export type HealthMetricEntry = z.infer<typeof healthMetricEntrySchema>;
export type HealthMetricData = z.infer<typeof healthMetricDataSchema>;
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;

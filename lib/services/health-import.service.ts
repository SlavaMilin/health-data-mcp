import type { FastifyBaseLogger } from "fastify";
import type { HealthDataRepository } from "../repositories/health-data.repository.ts";
import type Database from "better-sqlite3";
import type {
  HealthImportData,
  HealthImportResult,
  HealthMetricData,
  HealthMetricEntry,
  WorkoutEntry,
} from "../types/health-data.types.ts";
import { runHealthMigrations } from "../db-migrations.ts";

export interface HealthImportService {
  importHealthData: (jsonData: HealthImportData) => Promise<HealthImportResult>;
}

const normalizeJson = (obj: unknown): string => {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(item =>
      typeof item === 'object' && item !== null ? JSON.parse(normalizeJson(item)) : item
    ));
  }

  const sortedKeys = Object.keys(obj).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    normalized[key] = (obj as Record<string, unknown>)[key];
  }
  return JSON.stringify(normalized);
};

const normalizeMetricsData = (json: HealthImportData): Record<string, HealthMetricData> => {
  const metricsData = json.data?.metrics || json.metrics || {};

  if (Array.isArray(metricsData)) {
    const result: Record<string, HealthMetricData> = {};
    for (const metric of metricsData) {
      if (metric.name && metric.data && Array.isArray(metric.data)) {
        result[metric.name] = {
          entries: metric.data,
          units: metric.units || "",
        };
      }
    }
    return result;
  }

  return metricsData as Record<string, HealthMetricData>;
};

export const createHealthImportService = (
  db: Database.Database,
  healthDataRepo: HealthDataRepository,
  logger: FastifyBaseLogger
): HealthImportService => {
  const migrateMetrics = (metricsData: Record<string, HealthMetricData>): number => {
    return healthDataRepo.transaction(() => {
      let count = 0;

      for (const [name, metric] of Object.entries(metricsData)) {
        const entries = (metric.entries || metric) as HealthMetricEntry[];
        if (!Array.isArray(entries) || entries.length === 0) continue;

        const units = metric.units || String(entries[0]?.units ?? "");

        const firstEntry = entries[0];
        const schema = firstEntry
          ? JSON.stringify(Object.keys(firstEntry).sort())
          : null;

        healthDataRepo.insertMetricType(name, units, schema);
        if (schema) {
          healthDataRepo.updateMetricTypeSchema(name, schema);
        }
        const typeId = healthDataRepo.getMetricTypeId(name);

        for (const entry of entries) {
          if (!entry || typeof entry !== "object") continue;
          if (!entry.date) continue;

          const dataJson = normalizeJson(entry);
          healthDataRepo.insertHealthMetric(typeId, entry.date, dataJson);
          count++;
        }
      }

      return count;
    });
  };

  const migrateWorkouts = (workoutsData: WorkoutEntry[]): number => {
    const EXCLUDED_FIELDS = ["route"];

    return healthDataRepo.transaction(() => {
      let count = 0;

      const schemasByType: Record<string, string[]> = {};
      for (const w of workoutsData) {
        if (!w.name) continue;
        if (!schemasByType[w.name] && Object.keys(w).length > 0) {
          schemasByType[w.name] = Object.keys(w)
            .filter((k) => !EXCLUDED_FIELDS.includes(k))
            .sort();
        }
      }

      for (const w of workoutsData) {
        if (!w.name || !w.start || !w.end) continue;

        const schema = schemasByType[w.name]
          ? JSON.stringify(schemasByType[w.name])
          : null;
        healthDataRepo.insertWorkoutType(w.name, schema);
        if (schema) {
          healthDataRepo.updateWorkoutTypeSchema(w.name, schema);
        }
        const typeId = healthDataRepo.getWorkoutTypeId(w.name);

        const cleanWorkout = Object.fromEntries(
          Object.entries(w).filter(([key]) => !EXCLUDED_FIELDS.includes(key)),
        );
        const dataJson = normalizeJson(cleanWorkout);

        healthDataRepo.insertWorkout(typeId, w.start, w.end, dataJson);
        count++;
      }
      return count;
    });
  };

  return {
    importHealthData: async (jsonData: HealthImportData) => {
      logger.info("Starting health data import");

      await runHealthMigrations(db);

      const metricsData = normalizeMetricsData(jsonData);
      const workoutsData: WorkoutEntry[] = jsonData.data?.workouts || jsonData.workouts || [];

      const mCount = migrateMetrics(metricsData);
      const wCount = migrateWorkouts(workoutsData);

      logger.info({ metrics: mCount, workouts: wCount }, "Health data import completed");
      return { metrics: mCount, workouts: wCount };
    },
  };
};

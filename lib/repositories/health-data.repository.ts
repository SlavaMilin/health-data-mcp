import type Database from 'better-sqlite3';
import type { IdRow } from '../types/health-data.types.ts';

export interface HealthDataRepository {
  insertMetricType: (name: string, unit: string, schema: string | null) => void;
  updateMetricTypeSchema: (name: string, schema: string) => void;
  getMetricTypeId: (name: string) => number;
  insertHealthMetric: (typeId: number, date: string, data: string) => void;
  insertWorkoutType: (name: string, schema: string | null) => void;
  updateWorkoutTypeSchema: (name: string, schema: string) => void;
  getWorkoutTypeId: (name: string) => number;
  insertWorkout: (typeId: number, startDate: string, endDate: string, data: string) => void;
  transaction: <T>(fn: () => T) => T;
}

export const createHealthDataRepository = (db: Database.Database): HealthDataRepository => {
  const insertMetricTypeStmt = db.prepare(
    "INSERT OR IGNORE INTO metric_types (name, unit, schema) VALUES (?, ?, ?)",
  );
  const updateMetricTypeSchemaStmt = db.prepare(
    "UPDATE metric_types SET schema = ? WHERE name = ?",
  );
  const getMetricTypeIdStmt = db.prepare<[string], IdRow>("SELECT id FROM metric_types WHERE name = ?");
  const insertHealthMetricStmt = db.prepare(
    "INSERT OR IGNORE INTO health_metrics (type_id, date, data) VALUES (?, ?, ?)",
  );

  const insertWorkoutTypeStmt = db.prepare(
    "INSERT OR IGNORE INTO workout_types (name, schema) VALUES (?, ?)",
  );
  const updateWorkoutTypeSchemaStmt = db.prepare(
    "UPDATE workout_types SET schema = ? WHERE name = ?",
  );
  const getWorkoutTypeIdStmt = db.prepare<[string], IdRow>("SELECT id FROM workout_types WHERE name = ?");
  const insertWorkoutStmt = db.prepare(`
    INSERT OR IGNORE INTO workouts (type_id, start_date, end_date, data)
    VALUES (?, ?, ?, ?)
  `);

  return {
    insertMetricType: (name: string, unit: string, schema: string | null) => {
      insertMetricTypeStmt.run(name, unit, schema);
    },

    updateMetricTypeSchema: (name: string, schema: string) => {
      updateMetricTypeSchemaStmt.run(schema, name);
    },

    getMetricTypeId: (name: string): number => {
      const result = getMetricTypeIdStmt.get(name);
      if (!result) throw new Error(`Metric type not found: ${name}`);
      return result.id;
    },

    insertHealthMetric: (typeId: number, date: string, data: string) => {
      insertHealthMetricStmt.run(typeId, date, data);
    },

    insertWorkoutType: (name: string, schema: string | null) => {
      insertWorkoutTypeStmt.run(name, schema);
    },

    updateWorkoutTypeSchema: (name: string, schema: string) => {
      updateWorkoutTypeSchemaStmt.run(schema, name);
    },

    getWorkoutTypeId: (name: string): number => {
      const result = getWorkoutTypeIdStmt.get(name);
      if (!result) throw new Error(`Workout type not found: ${name}`);
      return result.id;
    },

    insertWorkout: (typeId: number, startDate: string, endDate: string, data: string) => {
      insertWorkoutStmt.run(typeId, startDate, endDate, data);
    },

    transaction: <T>(fn: () => T): T => {
      return db.transaction(fn)();
    },
  };
};

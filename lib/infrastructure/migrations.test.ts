import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations.ts';
import { MIGRATIONS_DIR } from '../constants/paths.constants.ts';

describe('runMigrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
  });

  it('should create health tables', async () => {
    await runMigrations(db, MIGRATIONS_DIR);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('metric_types');
    expect(tableNames).toContain('health_metrics');
    expect(tableNames).toContain('workout_types');
    expect(tableNames).toContain('workouts');
  });

  it('should create views', async () => {
    await runMigrations(db, MIGRATIONS_DIR);

    const views = db
      .prepare("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name")
      .all() as Array<{ name: string }>;

    const viewNames = views.map((v) => v.name);

    expect(viewNames).toContain('metrics_with_types');
    expect(viewNames).toContain('workouts_with_types');
  });

  it('should be idempotent', async () => {
    await runMigrations(db, MIGRATIONS_DIR);
    await runMigrations(db, MIGRATIONS_DIR);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('metric_types');
  });
});

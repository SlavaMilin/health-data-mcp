import type Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { migrate } from '@blackglory/better-sqlite3-migrations';
import { findMigrationFilenames, readMigrationFile } from 'migration-files';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Runs health data migrations (for stdio version)
 * Only applies migration 001
 */
export async function runHealthMigrations(db: Database.Database) {
  console.log('Running health data migrations...');

  const migrationsDir = join(__dirname, '..', 'migrations');
  const filenames = await findMigrationFilenames(migrationsDir);

  // Filter only health migrations (001)
  const healthFilenames = filenames.filter(f => f.includes('001-'));
  const migrations = await Promise.all(healthFilenames.map(readMigrationFile));

  migrate(db, migrations);

  console.log('Health data migrations completed');
}

/**
 * Runs all migrations (for server version)
 * Note: KeyvSqlite (for OAuth) creates its own 'caches' table automatically
 */
export async function runServerMigrations(db: Database.Database) {
  console.log('Running server migrations...');

  const migrationsDir = join(__dirname, '..', 'migrations');
  const filenames = await findMigrationFilenames(migrationsDir);
  const migrations = await Promise.all(filenames.map(readMigrationFile));

  migrate(db, migrations);

  console.log('Server migrations completed');
}

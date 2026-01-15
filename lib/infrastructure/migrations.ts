import type Database from 'better-sqlite3';
import { migrate } from '@blackglory/better-sqlite3-migrations';
import { findMigrationFilenames, readMigrationFile } from 'migration-files';

export const runMigrations = async (
  db: Database.Database,
  migrationsDir: string
): Promise<void> => {
  const filenames = await findMigrationFilenames(migrationsDir);
  const migrations = await Promise.all(filenames.map(readMigrationFile));
  migrate(db, migrations);
};

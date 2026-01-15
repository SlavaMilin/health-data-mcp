import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { Command } from "commander";
import Database from "better-sqlite3";
import { createHealthDataRepository } from "./repositories/health-data.repository.ts";
import { createHealthImportService } from "./services/health-import.service.ts";
import { runMigrations } from "./infrastructure/migrations.ts";
import { MIGRATIONS_DIR, DEFAULT_DB_PATH } from "./constants/paths.constants.ts";
import type { HealthImportData, HealthImportResult } from "./types/health-data.types.ts";

const logger = {
  info: (msg: unknown, extra?: string) => console.log(extra || msg, extra ? msg : ""),
  error: (msg: string) => console.error(msg),
};

export const runImport = async (
  jsonData: HealthImportData,
  dbPath: string
): Promise<HealthImportResult> => {
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);
  await runMigrations(db, MIGRATIONS_DIR);

  const repo = createHealthDataRepository(db);
  const service = createHealthImportService(repo, logger as never);

  const result = await service.importHealthData(jsonData);

  db.close();
  return result;
};

export const runImportCli = () => {
  const program = new Command()
    .name("import-health")
    .description("Import Auto Export health data to SQLite")
    .argument("<json-file>", "Path to Auto Export JSON file")
    .option("-o, --output <path>", "Output database path", DEFAULT_DB_PATH)
    .action(async (jsonFile, options) => {
      const jsonPath = resolve(jsonFile);
      const dbPath = resolve(options.output);

      if (!existsSync(jsonPath)) {
        console.error(`Error: File not found: ${jsonPath}`);
        process.exit(1);
      }

      console.log(`Importing from: ${jsonPath}`);
      console.log(`Database: ${dbPath}`);

      const jsonData = JSON.parse(readFileSync(jsonPath, "utf-8"));
      const result = await runImport(jsonData, dbPath);

      console.log(`Done: ${result.metrics} metrics, ${result.workouts} workouts`);
    });

  program.parse();
};

#!/usr/bin/env tsx
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import Database from "better-sqlite3";
import { createHealthDataRepository } from "../lib/repositories/health-data.repository.ts";
import { createHealthImportService } from "../lib/services/health-import.service.ts";
import { runHealthMigrations } from "../lib/db-migrations.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, "..", "data", "health_data.db");

const logger = {
  info: (msg: any, extra?: string) => console.log(extra || msg, extra ? msg : ""),
  error: (msg: string) => console.error(msg),
};

const program = new Command()
  .name("import-health")
  .description("Import Auto Export health data to SQLite")
  .argument("<json-file>", "Path to Auto Export JSON file")
  .option("-o, --output <path>", "Output database path", defaultDbPath)
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
    const db = new Database(dbPath);
    await runHealthMigrations(db);
    const repo = createHealthDataRepository(db);
    const service = createHealthImportService(db, repo, logger as any);

    const result = await service.importHealthData(jsonData);

    console.log(`Done: ${result.metrics} metrics, ${result.workouts} workouts`);
    db.close();
  });

program.parse();

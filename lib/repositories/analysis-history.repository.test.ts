import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createAnalysisHistoryRepository } from "./analysis-history.repository.ts";
import { runMigrations } from "../infrastructure/migrations.ts";
import { MIGRATIONS_DIR } from "../constants/paths.constants.ts";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";
import type { AnalysisHistoryPort } from "../domain/analysis.port.ts";
import type { AnalysisRecord } from "../domain/analysis.ts";

describe("AnalysisHistoryRepository", () => {
  let db: Database.Database;
  let repo: AnalysisHistoryPort;

  const getAnalysis = (
    date: string,
    type: string
  ): AnalysisRecord | undefined => {
    return db
      .prepare("SELECT * FROM analysis_history WHERE date = ? AND type = ?")
      .get(date, type) as AnalysisRecord | undefined;
  };

  beforeEach(async () => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    await runMigrations(db, MIGRATIONS_DIR);
    repo = createAnalysisHistoryRepository(db);
  });

  describe("save", () => {
    it("should insert analysis and return id", () => {
      const id = repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Test analysis",
      });
      expect(id).toBeGreaterThan(0);

      const record = getAnalysis("2025-01-12", ANALYSIS_TYPE.WEEKLY);
      expect(record?.analysis).toBe("Test analysis");
      expect(record?.type).toBe(ANALYSIS_TYPE.WEEKLY);
    });

    it("should upsert on conflict (same date+type)", () => {
      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "First analysis",
      });

      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Updated analysis",
      });

      const records = db
        .prepare("SELECT * FROM analysis_history WHERE date = ?")
        .all("2025-01-12");
      expect(records).toHaveLength(1);

      const record = getAnalysis("2025-01-12", ANALYSIS_TYPE.WEEKLY);
      expect(record?.analysis).toBe("Updated analysis");
    });

    it("should allow different types for same date", () => {
      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Weekly",
      });

      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.DAILY,
        analysis: "Daily",
      });

      const records = db
        .prepare("SELECT * FROM analysis_history WHERE date = ?")
        .all("2025-01-12");
      expect(records).toHaveLength(2);
    });
  });

  describe("getByDateAndType", () => {
    it("should return record if exists", () => {
      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Test",
      });

      const record = repo.getByDateAndType("2025-01-12", ANALYSIS_TYPE.WEEKLY);
      expect(record?.analysis).toBe("Test");
    });

    it("should return undefined if not exists", () => {
      const record = repo.getByDateAndType("2025-01-12", ANALYSIS_TYPE.WEEKLY);
      expect(record).toBeUndefined();
    });
  });

  describe("getRecentByType", () => {
    it("should return records ordered by date desc", () => {
      repo.save({
        date: "2025-01-05",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Week 1",
      });
      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Week 2",
      });
      repo.save({
        date: "2025-01-19",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Week 3",
      });

      const records = repo.getRecentByType(ANALYSIS_TYPE.WEEKLY, 2);
      expect(records).toHaveLength(2);
      expect(records[0].date).toBe("2025-01-19");
      expect(records[1].date).toBe("2025-01-12");
    });

    it("should filter by type", () => {
      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Weekly",
      });
      repo.save({
        date: "2025-01-12",
        type: ANALYSIS_TYPE.DAILY,
        analysis: "Daily",
      });

      const weeklyRecords = repo.getRecentByType(ANALYSIS_TYPE.WEEKLY, 10);
      expect(weeklyRecords).toHaveLength(1);
      expect(weeklyRecords[0].type).toBe(ANALYSIS_TYPE.WEEKLY);

      const dailyRecords = repo.getRecentByType(ANALYSIS_TYPE.DAILY, 10);
      expect(dailyRecords).toHaveLength(1);
      expect(dailyRecords[0].type).toBe(ANALYSIS_TYPE.DAILY);
    });

    it("should respect limit", () => {
      for (let i = 1; i <= 5; i++) {
        repo.save({
          date: `2025-01-0${i}`,
          type: ANALYSIS_TYPE.DAILY,
          analysis: `Day ${i}`,
        });
      }

      const records = repo.getRecentByType(ANALYSIS_TYPE.DAILY, 3);
      expect(records).toHaveLength(3);
    });
  });
});

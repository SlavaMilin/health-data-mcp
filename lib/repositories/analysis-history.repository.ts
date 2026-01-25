import type Database from "better-sqlite3";
import type {
  AnalysisRecord,
  AnalysisType,
  SaveAnalysisParams,
} from "../domain/analysis.ts";

export interface AnalysisHistoryRepository {
  save: (params: SaveAnalysisParams) => number;
  getByDateAndType: (
    date: string,
    type: AnalysisType
  ) => AnalysisRecord | undefined;
  getRecentByType: (type: AnalysisType, limit: number) => AnalysisRecord[];
}

export const createAnalysisHistoryRepository = (
  db: Database.Database
): AnalysisHistoryRepository => {
  // Upsert: insert or replace on conflict
  const upsertStmt = db.prepare(`
    INSERT INTO analysis_history (date, type, analysis)
    VALUES (?, ?, ?)
    ON CONFLICT(date, type) DO UPDATE SET
      analysis = excluded.analysis,
      created_at = datetime('now')
  `);

  const getByDateAndTypeStmt = db.prepare(`
    SELECT * FROM analysis_history WHERE date = ? AND type = ?
  `);

  const getRecentByTypeStmt = db.prepare(`
    SELECT * FROM analysis_history WHERE type = ? ORDER BY date DESC LIMIT ?
  `);

  return {
    save: ({ date, type, analysis }) => {
      const result = upsertStmt.run(date, type, analysis);
      return Number(result.lastInsertRowid);
    },

    getByDateAndType: (date, type) =>
      getByDateAndTypeStmt.get(date, type) as AnalysisRecord | undefined,

    getRecentByType: (type, limit) =>
      getRecentByTypeStmt.all(type, limit) as AnalysisRecord[],
  };
};

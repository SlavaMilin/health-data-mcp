import type { AnalysisType, AnalysisRecord, SaveAnalysisParams } from './analysis.ts';

export interface AnalysisHistoryPort {
  save: (params: SaveAnalysisParams) => number;
  getByDateAndType: (date: string, type: AnalysisType) => AnalysisRecord | undefined;
  getRecentByType: (type: AnalysisType, limit: number) => AnalysisRecord[];
}

export interface InstructionsPort {
  get: (type: AnalysisType) => string;
}

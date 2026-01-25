import type { ANALYSIS_TYPE } from './analysis.constants.ts';

export type AnalysisType = (typeof ANALYSIS_TYPE)[keyof typeof ANALYSIS_TYPE];

export interface AnalysisRecord {
  id: number;
  date: string;
  type: AnalysisType;
  analysis: string;
  created_at: string;
}

export interface SaveAnalysisParams {
  date: string;
  type: AnalysisType;
  analysis: string;
}

export interface GetAnalysisHistoryParams {
  type?: AnalysisType;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

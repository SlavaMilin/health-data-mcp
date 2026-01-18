import { readFileSync } from "fs";
import type { AnalysisType } from "../types/analysis.types.ts";

export interface InstructionsPaths {
  daily: string;
  weekly: string;
  monthly: string;
}

export interface InstructionsRepository {
  get: (type: AnalysisType) => string;
}

export const createInstructionsRepository = (
  paths: InstructionsPaths
): InstructionsRepository => ({
  get: (type) => readFileSync(paths[type], "utf-8"),
});

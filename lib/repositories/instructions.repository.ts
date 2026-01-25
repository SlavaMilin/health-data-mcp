import { readFileSync } from "fs";
import type { InstructionsPort } from "../domain/analysis.port.ts";

export interface InstructionsPaths {
  daily: string;
  weekly: string;
  monthly: string;
}

export const createInstructionsRepository = (
  paths: InstructionsPaths
): InstructionsPort => ({
  get: (type) => readFileSync(paths[type], "utf-8"),
});

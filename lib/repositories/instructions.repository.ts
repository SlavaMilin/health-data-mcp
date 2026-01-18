import { readFileSync } from "fs";

export interface InstructionsRepository {
  get: () => string;
}

export const createInstructionsRepository = (
  filePath: string
): InstructionsRepository => ({
  get: () => readFileSync(filePath, "utf-8"),
});

import { z } from "zod";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";

export const runAnalysisQuerySchema = z.object({
  type: z
    .enum([ANALYSIS_TYPE.DAILY, ANALYSIS_TYPE.WEEKLY, ANALYSIS_TYPE.MONTHLY])
    .default(ANALYSIS_TYPE.WEEKLY),
});

export type RunAnalysisQuery = z.infer<typeof runAnalysisQuerySchema>;

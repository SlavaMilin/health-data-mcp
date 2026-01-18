import cron, { type ScheduledTask } from "node-cron";
import type { AnalysisType } from "../types/analysis.types.ts";
import type { Logger } from "../types/logger.types.ts";

export interface SchedulerService {
  start: () => void;
  stop: () => void;
}

export interface ScheduleConfig {
  type: AnalysisType;
  cron: string;
}

export interface SchedulerServiceDeps {
  schedules: ScheduleConfig[];
  timezone: string;
  runAnalysis: (type: AnalysisType) => Promise<void>;
  logger: Logger;
}

export const createSchedulerService = ({
  schedules,
  timezone,
  runAnalysis,
  logger,
}: SchedulerServiceDeps): SchedulerService => {
  const tasks: ScheduledTask[] = [];

  return {
    start: () => {
      for (const { type, cron: cronExpr } of schedules) {
        const task = cron.schedule(
          cronExpr,
          async () => {
            try {
              logger.info(`Running ${type} analysis...`);
              await runAnalysis(type);
              logger.info(`${type} analysis completed`);
            } catch (error) {
              logger.error(error as Error, `${type} analysis failed`);
            }
          },
          { timezone }
        );
        tasks.push(task);
        logger.info(`Scheduled ${type} analysis: ${cronExpr} (${timezone})`);
      }
    },

    stop: () => {
      for (const task of tasks) {
        task.stop();
      }
      tasks.length = 0;
    },
  };
};

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSchedulerService } from "./scheduler.service.ts";
import type { Logger } from "../types/logger.types.ts";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn((cron, callback, options) => {
      return {
        stop: vi.fn(),
        _callback: callback,
        _cron: cron,
        _options: options,
      };
    }),
  },
}));

import cron from "node-cron";

describe("SchedulerService", () => {
  const mockLogger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockRunAnalysis = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("start", () => {
    it("should schedule tasks for each config", () => {
      const scheduler = createSchedulerService({
        schedules: [
          { type: "daily", cron: "0 9 * * *" },
          { type: "weekly", cron: "0 10 * * 1" },
        ],
        timezone: "Europe/Moscow",
        runAnalysis: mockRunAnalysis,
        logger: mockLogger,
      });

      scheduler.start();

      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(cron.schedule).toHaveBeenCalledWith(
        "0 9 * * *",
        expect.any(Function),
        { timezone: "Europe/Moscow" }
      );
      expect(cron.schedule).toHaveBeenCalledWith(
        "0 10 * * 1",
        expect.any(Function),
        { timezone: "Europe/Moscow" }
      );
    });

    it("should log scheduled tasks", () => {
      const scheduler = createSchedulerService({
        schedules: [{ type: "weekly", cron: "0 9 * * 1" }],
        timezone: "UTC",
        runAnalysis: mockRunAnalysis,
        logger: mockLogger,
      });

      scheduler.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Scheduled weekly analysis: 0 9 * * 1 (UTC)"
      );
    });

    it("should handle empty schedules", () => {
      const scheduler = createSchedulerService({
        schedules: [],
        timezone: "UTC",
        runAnalysis: mockRunAnalysis,
        logger: mockLogger,
      });

      scheduler.start();

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should stop all scheduled tasks", () => {
      const scheduler = createSchedulerService({
        schedules: [
          { type: "daily", cron: "0 9 * * *" },
          { type: "weekly", cron: "0 10 * * 1" },
        ],
        timezone: "UTC",
        runAnalysis: mockRunAnalysis,
        logger: mockLogger,
      });

      scheduler.start();
      scheduler.stop();

      const calls = vi.mocked(cron.schedule).mock.results;
      for (const call of calls) {
        expect(call.value.stop).toHaveBeenCalled();
      }
    });
  });

  describe("job execution", () => {
    it("should call runAnalysis with correct type", async () => {
      const scheduler = createSchedulerService({
        schedules: [{ type: "weekly", cron: "0 9 * * 1" }],
        timezone: "UTC",
        runAnalysis: mockRunAnalysis,
        logger: mockLogger,
      });

      scheduler.start();

      const scheduledTask = vi.mocked(cron.schedule).mock.results[0].value;
      await scheduledTask._callback();

      expect(mockRunAnalysis).toHaveBeenCalledWith("weekly");
      expect(mockLogger.info).toHaveBeenCalledWith("Running weekly analysis...");
      expect(mockLogger.info).toHaveBeenCalledWith("weekly analysis completed");
    });

    it("should log error when job fails", async () => {
      const error = new Error("Analysis failed");
      mockRunAnalysis.mockRejectedValueOnce(error);

      const scheduler = createSchedulerService({
        schedules: [{ type: "daily", cron: "0 9 * * *" }],
        timezone: "UTC",
        runAnalysis: mockRunAnalysis,
        logger: mockLogger,
      });

      scheduler.start();

      const scheduledTask = vi.mocked(cron.schedule).mock.results[0].value;
      await scheduledTask._callback();

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        "daily analysis failed"
      );
    });
  });
});

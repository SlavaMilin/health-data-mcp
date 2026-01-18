import { describe, it, expect, vi, afterEach } from "vitest";
import { calculatePeriodDate } from "./date.utils.ts";
import { ANALYSIS_TYPE } from "../constants/analysis.constants.ts";

describe("calculatePeriodDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("daily", () => {
    it("should return yesterday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-18T12:00:00Z"));

      const result = calculatePeriodDate(ANALYSIS_TYPE.DAILY);

      expect(result.date).toBe("2025-01-17");
      expect(result.periodStart).toBe("2025-01-17");
      expect(result.periodEnd).toBe("2025-01-17");
    });
  });

  describe("weekly", () => {
    it("should return last Sunday when today is Saturday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-18T12:00:00Z")); // Saturday

      const result = calculatePeriodDate(ANALYSIS_TYPE.WEEKLY);

      expect(result.date).toBe("2025-01-12"); // Last Sunday
      expect(result.periodStart).toBe("2025-01-06"); // Monday
      expect(result.periodEnd).toBe("2025-01-12"); // Sunday
    });

    it("should return last Sunday when today is Sunday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-19T12:00:00Z")); // Sunday

      const result = calculatePeriodDate(ANALYSIS_TYPE.WEEKLY);

      expect(result.date).toBe("2025-01-12"); // Previous Sunday
      expect(result.periodStart).toBe("2025-01-06");
      expect(result.periodEnd).toBe("2025-01-12");
    });

    it("should return last Sunday when today is Monday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-20T12:00:00Z")); // Monday

      const result = calculatePeriodDate(ANALYSIS_TYPE.WEEKLY);

      expect(result.date).toBe("2025-01-19"); // Yesterday (Sunday)
      expect(result.periodStart).toBe("2025-01-13");
      expect(result.periodEnd).toBe("2025-01-19");
    });
  });

  describe("monthly", () => {
    it("should return last day of previous month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-18T12:00:00Z"));

      const result = calculatePeriodDate(ANALYSIS_TYPE.MONTHLY);

      expect(result.date).toBe("2024-12-31");
      expect(result.periodStart).toBe("2024-12-01");
      expect(result.periodEnd).toBe("2024-12-31");
    });

    it("should handle February correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-15T12:00:00Z"));

      const result = calculatePeriodDate(ANALYSIS_TYPE.MONTHLY);

      expect(result.date).toBe("2025-02-28");
      expect(result.periodStart).toBe("2025-02-01");
      expect(result.periodEnd).toBe("2025-02-28");
    });
  });
});

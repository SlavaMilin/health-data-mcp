import { describe, it, expect, vi, afterEach } from "vitest";
import { calculatePeriodDate } from "./date.utils.ts";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";

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

    it("should respect timezone when UTC is next day but local is still previous", () => {
      vi.useFakeTimers();
      // UTC: 2025-01-18T02:00:00Z
      // America/New_York (UTC-5): 2025-01-17T21:00:00 - still Jan 17
      vi.setSystemTime(new Date("2025-01-18T02:00:00Z"));

      const result = calculatePeriodDate(ANALYSIS_TYPE.DAILY, "America/New_York");

      // Today in NY is Jan 17, so yesterday is Jan 16
      expect(result.today).toBe("2025-01-17");
      expect(result.date).toBe("2025-01-16");
      expect(result.periodStart).toBe("2025-01-16");
      expect(result.periodEnd).toBe("2025-01-16");
    });

    it("should respect timezone when local is ahead of UTC", () => {
      vi.useFakeTimers();
      // UTC: 2025-01-17T20:00:00Z
      // Asia/Tokyo (UTC+9): 2025-01-18T05:00:00 - already Jan 18
      vi.setSystemTime(new Date("2025-01-17T20:00:00Z"));

      const result = calculatePeriodDate(ANALYSIS_TYPE.DAILY, "Asia/Tokyo");

      // Today in Tokyo is Jan 18, so yesterday is Jan 17
      expect(result.today).toBe("2025-01-18");
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

    it("should respect timezone for weekly calculation", () => {
      vi.useFakeTimers();
      // UTC: Monday 2025-01-20T03:00:00Z
      // America/Los_Angeles (UTC-8): Sunday 2025-01-19T19:00:00 - still Sunday
      vi.setSystemTime(new Date("2025-01-20T03:00:00Z"));

      const result = calculatePeriodDate(ANALYSIS_TYPE.WEEKLY, "America/Los_Angeles");

      // In LA it's still Sunday Jan 19, so we get the PREVIOUS week
      expect(result.today).toBe("2025-01-19");
      expect(result.date).toBe("2025-01-12"); // Previous Sunday
      expect(result.periodStart).toBe("2025-01-06");
      expect(result.periodEnd).toBe("2025-01-12");
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

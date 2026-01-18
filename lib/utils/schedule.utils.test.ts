import { describe, it, expect } from "vitest";
import {
  parseTime,
  timeToDailyCron,
  timeToWeeklyCron,
  timeToMonthlyCron,
} from "./schedule.utils.ts";

describe("parseTime", () => {
  it("should parse valid time HH:MM", () => {
    expect(parseTime("09:00")).toEqual({ hour: 9, minute: 0 });
    expect(parseTime("23:59")).toEqual({ hour: 23, minute: 59 });
    expect(parseTime("00:00")).toEqual({ hour: 0, minute: 0 });
  });

  it("should parse single digit hour", () => {
    expect(parseTime("9:30")).toEqual({ hour: 9, minute: 30 });
  });

  it("should return null for invalid format", () => {
    expect(parseTime("9")).toBeNull();
    expect(parseTime("09:0")).toBeNull();
    expect(parseTime("09-00")).toBeNull();
    expect(parseTime("abc")).toBeNull();
    expect(parseTime("")).toBeNull();
  });

  it("should return null for out of range values", () => {
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("-1:00")).toBeNull();
  });
});

describe("timeToDailyCron", () => {
  it("should convert time to daily cron", () => {
    expect(timeToDailyCron("09:00")).toBe("0 9 * * *");
    expect(timeToDailyCron("23:30")).toBe("30 23 * * *");
    expect(timeToDailyCron("00:15")).toBe("15 0 * * *");
  });

  it("should return null for invalid time", () => {
    expect(timeToDailyCron("invalid")).toBeNull();
    expect(timeToDailyCron("25:00")).toBeNull();
  });
});

describe("timeToWeeklyCron", () => {
  it("should convert time to weekly cron with default Monday", () => {
    expect(timeToWeeklyCron("10:00")).toBe("0 10 * * 1");
  });

  it("should convert time to weekly cron with custom day", () => {
    expect(timeToWeeklyCron("10:00", 0)).toBe("0 10 * * 0"); // Sunday
    expect(timeToWeeklyCron("10:00", 5)).toBe("0 10 * * 5"); // Friday
    expect(timeToWeeklyCron("10:00", 6)).toBe("0 10 * * 6"); // Saturday
  });

  it("should return null for invalid time", () => {
    expect(timeToWeeklyCron("invalid")).toBeNull();
  });

  it("should return null for invalid day of week", () => {
    expect(timeToWeeklyCron("10:00", -1)).toBeNull();
    expect(timeToWeeklyCron("10:00", 7)).toBeNull();
  });
});

describe("timeToMonthlyCron", () => {
  it("should convert time to monthly cron with default 1st", () => {
    expect(timeToMonthlyCron("11:00")).toBe("0 11 1 * *");
  });

  it("should convert time to monthly cron with custom day", () => {
    expect(timeToMonthlyCron("11:00", 15)).toBe("0 11 15 * *");
    expect(timeToMonthlyCron("11:00", 31)).toBe("0 11 31 * *");
  });

  it("should return null for invalid time", () => {
    expect(timeToMonthlyCron("invalid")).toBeNull();
  });

  it("should return null for invalid day of month", () => {
    expect(timeToMonthlyCron("11:00", 0)).toBeNull();
    expect(timeToMonthlyCron("11:00", 32)).toBeNull();
  });
});

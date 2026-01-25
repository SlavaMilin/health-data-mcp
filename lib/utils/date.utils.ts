import type { AnalysisType } from "../domain/analysis.ts";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";

export interface PeriodInfo {
  date: string;
  periodStart: string;
  periodEnd: string;
  today: string;
}

const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get current date components in the specified timezone.
 */
const getDateInTimezone = (
  timezone: string
): { year: number; month: number; day: number; dayOfWeek: number } => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  const weekdayStr = parts.find((p) => p.type === "weekday")!.value;
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayStr];

  return { year, month, day, dayOfWeek };
};

/**
 * Calculate period boundaries based on analysis type.
 * - daily: yesterday
 * - weekly: last Sunday (Mon-Sun week)
 * - monthly: last day of previous month
 *
 * @param type - Analysis type (daily, weekly, monthly)
 * @param timezone - IANA timezone string (e.g., "Europe/Moscow", "UTC")
 */
export const calculatePeriodDate = (
  type: AnalysisType,
  timezone = "UTC"
): PeriodInfo => {
  const { year, month, day, dayOfWeek } = getDateInTimezone(timezone);
  const now = new Date(year, month - 1, day);
  const today = formatDate(now);

  if (type === ANALYSIS_TYPE.DAILY) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const date = formatDate(yesterday);
    return { date, periodStart: date, periodEnd: date, today };
  }

  if (type === ANALYSIS_TYPE.WEEKLY) {
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = new Date(now);
    lastSunday.setDate(lastSunday.getDate() - daysToLastSunday);
    const periodEnd = formatDate(lastSunday);

    const periodStartDate = new Date(lastSunday);
    periodStartDate.setDate(periodStartDate.getDate() - 6);
    const periodStart = formatDate(periodStartDate);

    return { date: periodEnd, periodStart, periodEnd, today };
  }

  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const periodEnd = formatDate(lastDayPrevMonth);

  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodStart = formatDate(firstDayPrevMonth);

  return { date: periodEnd, periodStart, periodEnd, today };
};

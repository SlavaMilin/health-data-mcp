import type { AnalysisType } from "../types/analysis.types.ts";
import { ANALYSIS_TYPE } from "../constants/analysis.constants.ts";

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
 * Calculate period boundaries based on analysis type.
 * - daily: yesterday
 * - weekly: last Sunday (Mon-Sun week)
 * - monthly: last day of previous month
 */
export const calculatePeriodDate = (type: AnalysisType): PeriodInfo => {
  const now = new Date();
  const today = formatDate(now);

  if (type === ANALYSIS_TYPE.DAILY) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const date = formatDate(yesterday);
    return { date, periodStart: date, periodEnd: date, today };
  }

  if (type === ANALYSIS_TYPE.WEEKLY) {
    const dayOfWeek = now.getDay();
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

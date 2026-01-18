/**
 * Parses time string (HH:MM) and returns hour and minute.
 * Throws if format is invalid.
 */
export const parseTime = (
  time: string
): { hour: number; minute: number } | null => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

/**
 * Converts time (HH:MM) to daily cron expression.
 * Example: "09:00" → "0 9 * * *"
 */
export const timeToDailyCron = (time: string): string | null => {
  const parsed = parseTime(time);
  if (!parsed) return null;
  return `${parsed.minute} ${parsed.hour} * * *`;
};

/**
 * Converts time (HH:MM) to weekly cron expression.
 * Example: "10:00", dayOfWeek=1 → "0 10 * * 1" (Monday)
 * dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
export const timeToWeeklyCron = (
  time: string,
  dayOfWeek: number = 1
): string | null => {
  const parsed = parseTime(time);
  if (!parsed) return null;
  if (dayOfWeek < 0 || dayOfWeek > 6) return null;
  return `${parsed.minute} ${parsed.hour} * * ${dayOfWeek}`;
};

/**
 * Converts time (HH:MM) to monthly cron expression.
 * Example: "11:00", dayOfMonth=1 → "0 11 1 * *" (1st of month)
 */
export const timeToMonthlyCron = (
  time: string,
  dayOfMonth: number = 1
): string | null => {
  const parsed = parseTime(time);
  if (!parsed) return null;
  if (dayOfMonth < 1 || dayOfMonth > 31) return null;
  return `${parsed.minute} ${parsed.hour} ${dayOfMonth} * *`;
};

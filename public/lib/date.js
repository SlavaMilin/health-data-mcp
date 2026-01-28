// @ts-check

/**
 * @typedef {import('./api.js').MealType} MealType
 */

/** @type {Record<MealType, string>} */
const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

/**
 * Get human-readable label for meal type
 * @param {MealType} type
 * @returns {string}
 */
export function getMealTypeLabel(type) {
  return MEAL_TYPE_LABELS[type] || type;
}

/**
 * Format date string for display (Today, Yesterday, or "January 29")
 * @param {string} dateStr - Format: YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Add days to a date string
 * @param {string} dateStr - Format: YYYY-MM-DD
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} - Format: YYYY-MM-DD
 */
export function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * Get today's date as string
 * @returns {string} - Format: YYYY-MM-DD
 */
export function getToday() {
  return toDateString(new Date());
}

/**
 * Convert Date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

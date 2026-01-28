// @ts-check

/**
 * @typedef {'breakfast' | 'lunch' | 'dinner' | 'snack'} MealType
 */

/**
 * @typedef {Object} Meal
 * @property {number} id
 * @property {string} date - Format: YYYY-MM-DD
 * @property {MealType} meal_type
 * @property {string} meal_name
 * @property {number} calories
 * @property {number} protein
 * @property {number} fat
 * @property {number} carbs
 */

/**
 * @typedef {Omit<Meal, 'id'>} MealInput
 */

/** @type {Meal[]} */
const MOCK_MEALS = [
  {
    id: 1,
    date: '2026-01-29',
    meal_type: 'breakfast',
    meal_name: 'Oatmeal with banana',
    calories: 420,
    protein: 12,
    fat: 8,
    carbs: 72,
  },
  {
    id: 2,
    date: '2026-01-29',
    meal_type: 'lunch',
    meal_name: 'Chicken breast with rice',
    calories: 580,
    protein: 45,
    fat: 12,
    carbs: 64,
  },
  {
    id: 3,
    date: '2026-01-29',
    meal_type: 'snack',
    meal_name: 'Greek yogurt',
    calories: 180,
    protein: 18,
    fat: 6,
    carbs: 12,
  },
  {
    id: 4,
    date: '2026-01-29',
    meal_type: 'dinner',
    meal_name: 'Tuna salad',
    calories: 660,
    protein: 67,
    fat: 42,
    carbs: 8,
  },
  {
    id: 5,
    date: '2026-01-28',
    meal_type: 'breakfast',
    meal_name: 'Scrambled eggs with toast',
    calories: 380,
    protein: 22,
    fat: 18,
    carbs: 32,
  },
  {
    id: 6,
    date: '2026-01-28',
    meal_type: 'lunch',
    meal_name: 'Beef stew with vegetables',
    calories: 620,
    protein: 42,
    fat: 28,
    carbs: 48,
  },
];

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch meals for a specific date
 * @param {string} date - Format: YYYY-MM-DD
 * @returns {Promise<Meal[]>}
 */
export async function fetchMeals(date) {
  await delay(300);
  return MOCK_MEALS.filter((m) => m.date === date);
}

/**
 * Delete a meal by ID
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteMeal(id) {
  await delay(200);
  const index = MOCK_MEALS.findIndex((m) => m.id === id);
  if (index !== -1) {
    MOCK_MEALS.splice(index, 1);
  }
}

/**
 * Update a meal
 * @param {number} id
 * @param {Partial<MealInput>} data
 * @returns {Promise<Meal | undefined>}
 */
export async function updateMeal(id, data) {
  await delay(200);
  const index = MOCK_MEALS.findIndex((m) => m.id === id);
  if (index !== -1) {
    MOCK_MEALS[index] = { ...MOCK_MEALS[index], ...data };
  }
  return MOCK_MEALS[index];
}

/**
 * Create a new meal
 * @param {MealInput} data
 * @returns {Promise<Meal>}
 */
export async function createMeal(data) {
  await delay(200);
  const newMeal = {
    id: Math.max(...MOCK_MEALS.map((m) => m.id)) + 1,
    ...data,
  };
  MOCK_MEALS.push(newMeal);
  return newMeal;
}

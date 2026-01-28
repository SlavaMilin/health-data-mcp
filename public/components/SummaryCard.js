// @ts-check
import { html, createMemo } from '../lib/solid.js';

/**
 * @typedef {import('../lib/api.js').Meal} Meal
 */

/**
 * @typedef {Object} Totals
 * @property {number} calories
 * @property {number} protein
 * @property {number} fat
 * @property {number} carbs
 */

/**
 * @typedef {Object} SummaryCardProps
 * @property {Meal[] | (() => Meal[])} meals - Array of meals or accessor function
 */

/** @param {SummaryCardProps} props */
export const SummaryCard = ({ meals }) => {
  const totals = createMemo(() => {
    /** @type {Meal[]} */
    const data = typeof meals === 'function' ? meals() : (meals || []);
    return (data || []).reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        fat: acc.fat + meal.fat,
        carbs: acc.carbs + meal.carbs,
      }),
      /** @type {Totals} */ ({ calories: 0, protein: 0, fat: 0, carbs: 0 })
    );
  });

  return html`
    <div class="summary-card">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="value">${() => totals().calories}</div>
          <div class="label">Kcal</div>
        </div>
        <div class="summary-item">
          <div class="value">${() => totals().protein}</div>
          <div class="label">Protein</div>
        </div>
        <div class="summary-item">
          <div class="value">${() => totals().fat}</div>
          <div class="label">Fat</div>
        </div>
        <div class="summary-item">
          <div class="value">${() => totals().carbs}</div>
          <div class="label">Carbs</div>
        </div>
      </div>
    </div>
  `;
};

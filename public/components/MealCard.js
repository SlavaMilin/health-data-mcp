// @ts-check
import { html } from '../lib/solid.js';
import { getMealTypeLabel } from '../lib/date.js';

/**
 * @typedef {import('../lib/api.js').Meal} Meal
 */

/**
 * @typedef {Object} MealCardProps
 * @property {Meal} meal - The meal to display
 * @property {(meal: Meal) => void} [onEdit] - Called when edit button clicked
 * @property {(id: number) => void} [onDelete] - Called when delete button clicked
 */

/** @param {MealCardProps} props */
export const MealCard = ({ meal, onEdit, onDelete }) => html`
  <div class="item-card">
    <div class="item-info">
      <div class="item-title">
        <span class="meal-type">${getMealTypeLabel(meal.meal_type)}</span>
        ${meal.meal_name}
      </div>
      <div class="item-subtitle">
        ${meal.calories} kcal ·
        P ${meal.protein}g ·
        F ${meal.fat}g ·
        C ${meal.carbs}g
      </div>
    </div>
    <div class="item-actions">
      <button class="btn-icon" title="Edit" onClick=${() => onEdit?.(meal)}>✏️</button>
      <button class="btn-icon" title="Delete" onClick=${() => onDelete?.(meal.id)}>🗑️</button>
    </div>
  </div>
`;

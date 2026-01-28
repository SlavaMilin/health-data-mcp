// @ts-check
import { createSignal, createResource, html } from '../lib/solid.js';
import { fetchMeals, deleteMeal } from '../lib/api.js';
import { formatDate, addDays, getToday } from '../lib/date.js';
import { MealCard } from './MealCard.js';
import { SummaryCard } from './SummaryCard.js';

/**
 * @typedef {import('../lib/api.js').Meal} Meal
 */

/**
 * Main meal diary page with date navigation and meal list
 */
export const MealList = () => {
  /** @type {import('../lib/solid.js').Signal<string>} */
  const [date, setDate] = createSignal(getToday());

  /** @type {import('../lib/solid.js').Resource<Meal[]>} */
  const [meals, { refetch }] = createResource(date, fetchMeals);

  /** @param {Event} e */
  const handleDateChange = (e) => setDate(/** @type {HTMLInputElement} */ (e.target).value);
  const prevDay = () => setDate(addDays(date(), -1));
  const nextDay = () => setDate(addDays(date(), 1));
  const goToday = () => setDate(getToday());

  /** @param {number} id */
  const handleDelete = async (id) => {
    if (confirm('Delete this meal?')) {
      await deleteMeal(id);
      refetch();
    }
  };

  /** @param {Meal} meal */
  const handleEdit = (meal) => {
    // TODO: open edit modal
    console.log('Edit meal:', meal);
  };

  const handleAdd = () => {
    // TODO: open add modal
    console.log('Add new meal for date:', date());
  };

  return html`
    <div class="date-header">
      <input
        type="date"
        value=${date}
        onChange=${handleDateChange}
        onClick=${(/** @type {Event} */ e) => /** @type {HTMLInputElement} */ (e.target).showPicker()}
        max=${getToday()}
      />
      <h2>${() => formatDate(date())}</h2>
      <div class="date-nav">
        <button class="outline" onClick=${prevDay}>←</button>
        <button class="outline" onClick=${goToday}>Today</button>
        <button class="outline" onClick=${nextDay}>→</button>
      </div>
    </div>

    <${SummaryCard} meals=${() => meals() || []} />

    ${() =>
      meals.loading &&
      html`
        <div class="loading">
          <p>Loading...</p>
        </div>
      `}

    ${() =>
      meals.error &&
      html`
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <p>Error loading: ${meals.error.message}</p>
        </div>
      `}

    ${() =>
      !meals.loading &&
      !meals.error &&
      meals()?.length === 0 &&
      html`
        <div class="empty-state">
          <div class="icon">🍽️</div>
          <p>No meals for this day</p>
        </div>
      `}

    ${() =>
      !meals.loading &&
      !meals.error &&
      meals()?.length > 0 &&
      html`
        <div class="card-list">
          ${() =>
            meals().map(
              (meal) => html`
                <${MealCard}
                  key=${meal.id}
                  meal=${meal}
                  onEdit=${handleEdit}
                  onDelete=${handleDelete}
                />
              `
            )}
        </div>
      `}

    <button class="fab" onClick=${handleAdd}>+</button>
  `;
};

// @ts-check
import { html } from '../lib/solid.js';

/**
 * @typedef {'meals' | 'workouts' | 'settings'} Page
 */

/**
 * @typedef {Object} BottomNavProps
 * @property {Page | (() => Page)} page - Current active page or accessor
 * @property {(page: Page) => void} setPage - Function to change page
 */

/** @param {BottomNavProps} props */
export const BottomNav = ({ page, setPage }) => {
  /** @param {Page} name */
  const isActive = (name) => {
    const current = typeof page === 'function' ? page() : page;
    return current === name;
  };

  return html`
    <nav class="bottom-nav">
      <a class=${() => (isActive('meals') ? 'active' : '')} onClick=${() => setPage('meals')}>
        <span class="icon">🍽️</span>
        <span>Meals</span>
      </a>
      <a class=${() => (isActive('workouts') ? 'active' : '')} onClick=${() => setPage('workouts')}>
        <span class="icon">💪</span>
        <span>Workouts</span>
      </a>
      <a class=${() => (isActive('settings') ? 'active' : '')} onClick=${() => setPage('settings')}>
        <span class="icon">⚙️</span>
        <span>Settings</span>
      </a>
    </nav>
  `;
};

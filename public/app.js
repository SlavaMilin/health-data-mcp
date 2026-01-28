// @ts-check
import { createSignal, render, html } from './lib/solid.js';
import { MealList } from './components/MealList.js';
import { WorkoutList } from './components/WorkoutList.js';
import { Settings } from './components/Settings.js';
import { BottomNav } from './components/BottomNav.js';

/**
 * @typedef {import('./components/BottomNav.js').Page} Page
 */

/**
 * Root application component
 */
const App = () => {
  /** @type {import('./lib/solid.js').Signal<Page>} */
  const [page, setPage] = createSignal(/** @type {Page} */ ('meals'));

  return html`
    <main class="container">
      ${() => page() === 'meals' && html`<${MealList} />`}
      ${() => page() === 'workouts' && html`<${WorkoutList} />`}
      ${() => page() === 'settings' && html`<${Settings} />`}
    </main>
    <${BottomNav} page=${() => page()} setPage=${setPage} />
  `;
};

render(App, document.getElementById('app'));

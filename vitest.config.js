import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    include: ['tests/**/*.test.{js,ts}', 'lib/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'tests/**/*.integration.test.{js,ts}'],
    passWithNoTests: true,
  },
});

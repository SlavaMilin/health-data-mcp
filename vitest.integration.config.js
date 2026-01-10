import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 30000,
    include: ['tests/**/*.integration.test.{js,ts}'],
  },
});

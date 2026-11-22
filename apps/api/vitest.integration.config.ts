import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    globalSetup: ['./integration-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/data/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', NIVEAU_JOURNAL: 'silent' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/serveur.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});

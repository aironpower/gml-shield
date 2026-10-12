import { defineConfig } from 'vitest/config';
import { URL_BASE_DONNEES_TEST } from './tests/outils/url-base-donnees-test.js';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', NIVEAU_JOURNAL: 'silent', DATABASE_URL: URL_BASE_DONNEES_TEST },
    globalSetup: ['tests/outils/preparer-base-donnees-test.ts'],
    setupFiles: ['tests/outils/fermer-connexions.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/serveur.ts', 'src/migrer.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});

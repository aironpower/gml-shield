import { defineConfig } from 'vitest/config';
import { ENVIRONNEMENT_TEST } from './tests/outils/environnement-test.js';

export default defineConfig({
  test: {
    environment: 'node',
    env: ENVIRONNEMENT_TEST,
    globalSetup: ['tests/outils/preparer-base-donnees-test.ts'],
    setupFiles: ['tests/outils/fermer-connexions.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/serveur.ts',
        'src/migrer.ts',
        'src/creer-comptes-demo.ts',
        'src/preparer-stockage.ts',
      ],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});

import { afterAll } from 'vitest';
import { poolConnexions } from '../../src/infrastructure/base-de-donnees/pool-connexions.js';

afterAll(async () => {
  await poolConnexions.end();
});

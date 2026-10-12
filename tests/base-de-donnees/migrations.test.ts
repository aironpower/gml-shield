import { describe, expect, it } from 'vitest';
import { appliquerMigrations } from '../../src/infrastructure/base-de-donnees/migrations.js';
import { URL_BASE_DONNEES_TEST } from '../outils/url-base-donnees-test.js';

describe('Migrations du schéma', () => {
  it('peuvent être rejouées sans effet sur une base déjà à jour', async () => {
    await expect(appliquerMigrations(URL_BASE_DONNEES_TEST)).resolves.toBeUndefined();
  });
});

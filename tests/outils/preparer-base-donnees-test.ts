import { URL_BASE_DONNEES_TEST } from './url-base-donnees-test.js';

/**
 * Exécuté une seule fois avant toute la suite : met le schéma de la base de test à jour.
 * L'import est dynamique car la configuration de l'application est validée dès son
 * chargement et exige DATABASE_URL.
 */
export async function setup(): Promise<void> {
  process.env.DATABASE_URL = URL_BASE_DONNEES_TEST;
  process.env.NIVEAU_JOURNAL = 'silent';
  const { appliquerMigrations } =
    await import('../../src/infrastructure/base-de-donnees/migrations.js');
  await appliquerMigrations(URL_BASE_DONNEES_TEST);
}

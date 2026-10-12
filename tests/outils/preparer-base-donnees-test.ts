import { ENVIRONNEMENT_TEST, URL_BASE_DONNEES_TEST } from './environnement-test.js';

/**
 * Exécuté une seule fois avant toute la suite : met le schéma de la base de test à jour.
 * L'import est dynamique car la configuration de l'application est validée dès son
 * chargement et exige les variables d'environnement de test.
 */
export async function setup(): Promise<void> {
  Object.assign(process.env, ENVIRONNEMENT_TEST);
  const { appliquerMigrations } =
    await import('../../src/infrastructure/base-de-donnees/migrations.js');
  await appliquerMigrations(URL_BASE_DONNEES_TEST);
}

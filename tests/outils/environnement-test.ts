import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Base locale du docker-compose (ou service PostgreSQL de la CI) : aucun mot de passe versionné.
export const URL_BASE_DONNEES_TEST =
  process.env.DATABASE_URL_TEST ?? 'postgres://gml_shield@127.0.0.1:5433/gml_shield_test';

/**
 * Variables d'environnement de la suite de tests, partagées par la configuration Vitest et
 * la préparation de la base. Valeurs propres aux tests, sans rapport avec la production.
 */
export const ENVIRONNEMENT_TEST = {
  NODE_ENV: 'test',
  NIVEAU_JOURNAL: 'silent',
  DATABASE_URL: URL_BASE_DONNEES_TEST,
  SECRET_JWT: 'secret-de-test-uniquement-ne-jamais-utiliser-en-production',
  ORIGINE_AUTORISEE: 'http://localhost:3000',
  CLE_CHIFFREMENT_SECRETS: Buffer.alloc(32, 7).toString('base64'),
  STOCKAGE_PREUVES: 'disque',
  DOSSIER_PREUVES: join(tmpdir(), 'gml-shield-tests', 'preuves'),
};

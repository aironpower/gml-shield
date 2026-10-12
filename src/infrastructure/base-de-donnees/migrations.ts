import { runner } from 'node-pg-migrate';
import type pg from 'pg';
import { journalApplicatif } from '../journal-applicatif.js';

const DOSSIER_MIGRATIONS = 'migrations';
const TABLE_SUIVI_MIGRATIONS = 'schema_migrations';

/**
 * Applique, dans l'ordre, les migrations SQL pas encore exécutées sur la base ciblée.
 *
 * Pourquoi des migrations versionnées plutôt qu'un script de création unique : le schéma
 * évoluera (multi-tenant, partenaires — Dossier 2) sans jamais recréer la base de production ;
 * chaque changement est relu en pull request comme le reste du code.
 * `checkOrder` refuse une migration insérée avant une migration déjà appliquée, afin que
 * toutes les bases (locale, test, production) suivent exactement la même histoire.
 */
export async function appliquerMigrations(connexion: string | pg.ClientConfig): Promise<void> {
  await runner({
    databaseUrl: connexion,
    dir: DOSSIER_MIGRATIONS,
    migrationsTable: TABLE_SUIVI_MIGRATIONS,
    direction: 'up',
    checkOrder: true,
    singleTransaction: true,
    log: (message) => {
      journalApplicatif.info(message);
    },
  });
}

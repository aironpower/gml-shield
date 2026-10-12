import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { expect } from 'vitest';
import { poolConnexions } from '../../src/infrastructure/base-de-donnees/pool-connexions.js';

export const EMPREINTE_ARGON2ID_FACTICE =
  '$argon2id$v=19$m=19456,t=2,p=1$c2VsZmFjdGljZQ$ZmFjdGljZQ';

type RoleUtilisateur = 'ADMIN' | 'DISPATCHER' | 'DRIVER';

/** Codes SQLSTATE de PostgreSQL attendus lors des refus (https://www.postgresql.org/docs/current/errcodes-appendix.html). */
export const CODE_ERREUR_POSTGRES = {
  VALEUR_ENUMEREE_INVALIDE: '22P02',
  CONTRAINTE_CHECK: '23514',
  CONTRAINTE_UNICITE: '23505',
  CLE_ETRANGERE: '23503',
  PRIVILEGE_INSUFFISANT: '42501',
} as const;

type CodeErreurPostgres = (typeof CODE_ERREUR_POSTGRES)[keyof typeof CODE_ERREUR_POSTGRES];

/**
 * Exécute un scénario dans une transaction systématiquement annulée.
 * Pourquoi : chaque test part d'une base propre et les fichiers de test peuvent
 * s'exécuter en parallèle sans se voir les uns les autres.
 */
export async function executerDansTransactionAnnulee(
  scenario: (client: pg.PoolClient) => Promise<void>,
): Promise<void> {
  const client = await poolConnexions.connect();
  try {
    await client.query('BEGIN');
    await scenario(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

/**
 * Vérifie que PostgreSQL refuse la requête pour la raison attendue, sans invalider
 * la transaction du test.
 * Pourquoi vérifier le code d'erreur : un refus causé par une faute de frappe SQL ferait
 * passer le test sans rien prouver ; le code SQLSTATE garantit que c'est bien la règle
 * visée (CHECK, unicité, clé étrangère, déclencheur) qui a rejeté l'opération.
 * Pourquoi un point de sauvegarde : après une erreur, PostgreSQL rejette toute requête
 * de la transaction ; revenir au point de sauvegarde permet de poursuivre le scénario.
 */
export async function attendreRefusParLaBase(
  client: pg.PoolClient,
  requete: string,
  valeurs: unknown[],
  codeErreurAttendu: CodeErreurPostgres,
): Promise<void> {
  await client.query('SAVEPOINT avant_refus');
  await expect(client.query(requete, valeurs)).rejects.toMatchObject({ code: codeErreurAttendu });
  await client.query('ROLLBACK TO SAVEPOINT avant_refus');
}

export async function insererUtilisateur(
  client: pg.PoolClient,
  role: RoleUtilisateur,
): Promise<string> {
  const resultat = await client.query<{ id: string }>(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
    [`${role.toLowerCase()}-${randomUUID()}@gml.test`, EMPREINTE_ARGON2ID_FACTICE, role],
  );
  return premiereLigne(resultat).id;
}

export async function insererMission(
  client: pg.PoolClient,
  idChauffeur: string,
  idRepartiteur: string,
): Promise<string> {
  const resultat = await client.query<{ id: string }>(
    `INSERT INTO missions (title, destination, secret_code, driver_id, dispatcher_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['Livraison test', 'Entrepôt Lyon Sud', Buffer.from([1, 2, 3]), idChauffeur, idRepartiteur],
  );
  return premiereLigne(resultat).id;
}

export function premiereLigne<Ligne extends pg.QueryResultRow>(
  resultat: pg.QueryResult<Ligne>,
): Ligne {
  const [ligne] = resultat.rows;
  if (ligne === undefined) {
    throw new Error('La requête n’a renvoyé aucune ligne');
  }
  return ligne;
}

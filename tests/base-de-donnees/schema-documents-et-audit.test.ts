import type pg from 'pg';
import { describe, it } from 'vitest';
import {
  attendreRefusParLaBase,
  CODE_ERREUR_POSTGRES,
  executerDansTransactionAnnulee,
  insererMission,
  insererUtilisateur,
  premiereLigne,
} from '../outils/base-de-donnees-test.js';

describe('Schéma : table documents', () => {
  it('refuse un type de fichier autre que JPEG, PNG ou PDF', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idChauffeur = await insererUtilisateur(client, 'DRIVER');
      const idRepartiteur = await insererUtilisateur(client, 'DISPATCHER');
      const idMission = await insererMission(client, idChauffeur, idRepartiteur);

      await attendreRefusParLaBase(
        client,
        `INSERT INTO documents (mission_id, file_path, mime_type, size_bytes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [idMission, 'preuves/script.html', 'text/html', 120, idChauffeur],
        CODE_ERREUR_POSTGRES.CONTRAINTE_CHECK,
      );
    });
  });
});

describe('Schéma : table audit_logs (ajout seul)', () => {
  async function insererTraceAudit(client: pg.PoolClient): Promise<string> {
    const resultat = await client.query<{ id: string }>(
      `INSERT INTO audit_logs (user_id, action, ip_address, http_status)
       VALUES (NULL, $1, $2, $3) RETURNING id`,
      ['POST /api/auth/login', '203.0.113.7', 401],
    );
    return premiereLigne(resultat).id;
  }

  it('refuse la modification d’une trace existante', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idTrace = await insererTraceAudit(client);

      await attendreRefusParLaBase(
        client,
        'UPDATE audit_logs SET action = $2 WHERE id = $1',
        [idTrace, 'action falsifiée'],
        CODE_ERREUR_POSTGRES.PRIVILEGE_INSUFFISANT,
      );
    });
  });

  it('refuse la suppression d’une trace existante', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idTrace = await insererTraceAudit(client);

      await attendreRefusParLaBase(
        client,
        'DELETE FROM audit_logs WHERE id = $1',
        [idTrace],
        CODE_ERREUR_POSTGRES.PRIVILEGE_INSUFFISANT,
      );
    });
  });

  it('refuse la purge complète du journal', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      await attendreRefusParLaBase(
        client,
        'TRUNCATE audit_logs',
        [],
        CODE_ERREUR_POSTGRES.PRIVILEGE_INSUFFISANT,
      );
    });
  });
});

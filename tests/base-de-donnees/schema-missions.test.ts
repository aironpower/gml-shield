import { describe, expect, it } from 'vitest';
import {
  attendreRefusParLaBase,
  CODE_ERREUR_POSTGRES,
  executerDansTransactionAnnulee,
  insererMission,
  insererUtilisateur,
  premiereLigne,
} from '../outils/base-de-donnees-test.js';

const CHANGEMENT_STATUT = 'UPDATE missions SET status = $2 WHERE id = $1';
const LECTURE_STATUT = 'SELECT status FROM missions WHERE id = $1';

describe('Schéma : table missions', () => {
  it('stocke le code secret sous forme d’octets et non de texte lisible (RG2)', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const resultat = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'missions' AND column_name = 'secret_code'`,
      );

      expect(premiereLigne(resultat).data_type).toBe('bytea');
    });
  });

  it('crée une mission au statut PENDING', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idChauffeur = await insererUtilisateur(client, 'DRIVER');
      const idRepartiteur = await insererUtilisateur(client, 'DISPATCHER');
      const idMission = await insererMission(client, idChauffeur, idRepartiteur);

      const resultat = await client.query<{ status: string }>(LECTURE_STATUT, [idMission]);

      expect(premiereLigne(resultat).status).toBe('PENDING');
    });
  });

  it('accepte le cycle de vie linéaire PENDING → IN_PROGRESS → COMPLETED (RG3)', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idChauffeur = await insererUtilisateur(client, 'DRIVER');
      const idRepartiteur = await insererUtilisateur(client, 'DISPATCHER');
      const idMission = await insererMission(client, idChauffeur, idRepartiteur);

      await client.query(CHANGEMENT_STATUT, [idMission, 'IN_PROGRESS']);
      await client.query(CHANGEMENT_STATUT, [idMission, 'COMPLETED']);

      const resultat = await client.query<{ status: string }>(LECTURE_STATUT, [idMission]);
      expect(premiereLigne(resultat).status).toBe('COMPLETED');
    });
  });

  it('refuse de sauter une étape du cycle de vie (RG3)', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idChauffeur = await insererUtilisateur(client, 'DRIVER');
      const idRepartiteur = await insererUtilisateur(client, 'DISPATCHER');
      const idMission = await insererMission(client, idChauffeur, idRepartiteur);

      await attendreRefusParLaBase(
        client,
        CHANGEMENT_STATUT,
        [idMission, 'COMPLETED'],
        CODE_ERREUR_POSTGRES.CONTRAINTE_CHECK,
      );
    });
  });

  it('refuse de revenir en arrière dans le cycle de vie (RG3)', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idChauffeur = await insererUtilisateur(client, 'DRIVER');
      const idRepartiteur = await insererUtilisateur(client, 'DISPATCHER');
      const idMission = await insererMission(client, idChauffeur, idRepartiteur);
      await client.query(CHANGEMENT_STATUT, [idMission, 'IN_PROGRESS']);
      await client.query(CHANGEMENT_STATUT, [idMission, 'COMPLETED']);

      await attendreRefusParLaBase(
        client,
        CHANGEMENT_STATUT,
        [idMission, 'PENDING'],
        CODE_ERREUR_POSTGRES.CONTRAINTE_CHECK,
      );
    });
  });

  it('refuse une mission assignée à un chauffeur inexistant', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idRepartiteur = await insererUtilisateur(client, 'DISPATCHER');

      await attendreRefusParLaBase(
        client,
        `INSERT INTO missions (title, destination, secret_code, driver_id, dispatcher_id)
         VALUES ($1, $2, $3, gen_random_uuid(), $4)`,
        ['Mission orpheline', 'Lyon', Buffer.from([1]), idRepartiteur],
        CODE_ERREUR_POSTGRES.CLE_ETRANGERE,
      );
    });
  });
});

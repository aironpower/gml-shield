import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import { poolConnexions } from '../../src/infrastructure/base-de-donnees/pool-connexions.js';
import { premiereLigne } from '../outils/base-de-donnees-test.js';
import {
  changerStatutViaApi,
  creerMissionViaApi,
  deposerFichierViaApi,
  IMAGE_PNG_VALIDE,
} from '../outils/missions-test.js';
import {
  creerCompteDeTest,
  obtenirCookieSession,
  ORIGINE_CLIENT,
  type CompteDeTest,
} from '../outils/sessions-test.js';

interface MissionRecue {
  id: string;
  status: string;
  secret_code?: string;
  driver_id: string;
}

describe('Missions : création, cloisonnement et cycle de vie', () => {
  let application: Express;
  let repartiteur: CompteDeTest;
  let chauffeur: CompteDeTest;
  let autreChauffeur: CompteDeTest;
  let cookieRepartiteur: string;
  let cookieChauffeur: string;
  let cookieAutreChauffeur: string;

  beforeEach(async () => {
    application = creerApplication();
    [repartiteur, chauffeur, autreChauffeur] = await Promise.all([
      creerCompteDeTest('DISPATCHER'),
      creerCompteDeTest('DRIVER'),
      creerCompteDeTest('DRIVER'),
    ]);
    [cookieRepartiteur, cookieChauffeur, cookieAutreChauffeur] = await Promise.all([
      obtenirCookieSession(application, repartiteur),
      obtenirCookieSession(application, chauffeur),
      obtenirCookieSession(application, autreChauffeur),
    ]);
  });

  function listerMissions(cookie: string): request.Test {
    return request(application).get('/api/missions').set('Cookie', cookie);
  }

  function creerMissionBrute(cookie: string, corps: object): request.Test {
    return request(application)
      .post('/api/missions')
      .set('Origin', ORIGINE_CLIENT)
      .set('Cookie', cookie)
      .send(corps);
  }

  describe('POST /api/missions', () => {
    it('crée une mission PENDING sans renvoyer le code secret au répartiteur', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);

      expect(mission).toMatchObject({ title: 'Livraison IRM', status: 'PENDING' });
      expect(mission).not.toHaveProperty('secret_code');
    });

    it('stocke le code chiffré : illisible pour un administrateur de la base (RG2)', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);

      const resultat = await poolConnexions.query<{ secret_code: Buffer }>(
        'SELECT secret_code FROM missions WHERE id = $1',
        [mission.id],
      );

      expect(premiereLigne(resultat).secret_code.toString('latin1')).not.toContain('QUAI-4821');
    });

    it('enregistre une tentative d’injection SQL comme un simple texte', async () => {
      const reponse = await creerMissionBrute(cookieRepartiteur, {
        title: "x'); DROP TABLE missions; --",
        destination: 'Lyon',
        secret_code: 'QUAI-1',
        driver_id: chauffeur.id,
      });

      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({ title: "x'); DROP TABLE missions; --" });
    });

    it('refuse l’assignation à un utilisateur qui n’est pas un chauffeur actif', async () => {
      const reponse = await creerMissionBrute(cookieRepartiteur, {
        title: 'Mission',
        destination: 'Lyon',
        secret_code: 'QUAI-1',
        driver_id: repartiteur.id,
      });

      expect(reponse.status).toBe(422);
    });

    it('refuse des données incomplètes en désignant le champ fautif', async () => {
      const reponse = await creerMissionBrute(cookieRepartiteur, { title: 'Sans destination' });

      expect(reponse.status).toBe(400);
      expect(reponse.body).toMatchObject({ error: 'Données invalides' });
    });

    it('interdit à un chauffeur de créer une mission', async () => {
      const reponse = await creerMissionBrute(cookieChauffeur, {
        title: 'Mission',
        destination: 'Lyon',
        secret_code: 'QUAI-1',
        driver_id: chauffeur.id,
      });

      expect(reponse.status).toBe(403);
    });
  });

  describe('GET /api/missions', () => {
    it('donne au chauffeur ses seules missions, avec le code déchiffré (RG1)', async () => {
      await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id, 'QUAI-1111');
      await creerMissionViaApi(application, cookieRepartiteur, autreChauffeur.id, 'QUAI-2222');

      const reponse = await listerMissions(cookieChauffeur);
      const missions = reponse.body as MissionRecue[];

      expect(missions).toHaveLength(1);
      expect(missions[0]).toMatchObject({ driver_id: chauffeur.id, secret_code: 'QUAI-1111' });
    });

    it('donne au répartiteur les missions qu’il a créées, sans aucun code secret', async () => {
      const autreRepartiteur = await creerCompteDeTest('DISPATCHER');
      const cookieAutreRepartiteur = await obtenirCookieSession(application, autreRepartiteur);
      await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);
      await creerMissionViaApi(application, cookieAutreRepartiteur, chauffeur.id);

      const missions = (await listerMissions(cookieRepartiteur)).body as MissionRecue[];

      expect(missions).toHaveLength(1);
      expect(missions[0]).not.toHaveProperty('secret_code');
    });

    it('refuse l’accès sans session', async () => {
      const reponse = await request(application).get('/api/missions');

      expect(reponse.status).toBe(401);
    });

    it('refuse l’accès à l’administrateur sécurité, qui n’a pas à lire les missions', async () => {
      const administrateur = await creerCompteDeTest('ADMIN');
      const cookieAdministrateur = await obtenirCookieSession(application, administrateur);

      const reponse = await listerMissions(cookieAdministrateur);

      expect(reponse.status).toBe(403);
    });
  });

  describe('PATCH /api/missions/:id/status', () => {
    it('fait passer la mission de PENDING à IN_PROGRESS', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);

      const reponse = await changerStatutViaApi(
        application,
        cookieChauffeur,
        mission.id,
        'IN_PROGRESS',
      );

      expect(reponse.status).toBe(200);
      expect(reponse.body).toMatchObject({ status: 'IN_PROGRESS', secret_code: 'QUAI-4821' });
    });

    it('refuse de sauter l’étape IN_PROGRESS (RG3)', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);

      const reponse = await changerStatutViaApi(
        application,
        cookieChauffeur,
        mission.id,
        'COMPLETED',
      );

      expect(reponse.status).toBe(409);
    });

    it('refuse de clôturer une mission sans preuve de livraison', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);
      await changerStatutViaApi(application, cookieChauffeur, mission.id, 'IN_PROGRESS');

      const reponse = await changerStatutViaApi(
        application,
        cookieChauffeur,
        mission.id,
        'COMPLETED',
      );

      expect(reponse.status).toBe(409);
      expect(reponse.body).toEqual({
        error: 'Une preuve de livraison est requise pour clôturer la mission',
      });
    });

    it('clôture la mission une fois la preuve déposée', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);
      await changerStatutViaApi(application, cookieChauffeur, mission.id, 'IN_PROGRESS');
      await deposerFichierViaApi(application, cookieChauffeur, mission.id, {
        contenu: IMAGE_PNG_VALIDE,
        nom: 'preuve.png',
        type: 'image/png',
      });

      const reponse = await changerStatutViaApi(
        application,
        cookieChauffeur,
        mission.id,
        'COMPLETED',
      );

      expect(reponse.status).toBe(200);
      expect(reponse.body).toMatchObject({ status: 'COMPLETED' });
    });

    it('répond « introuvable » pour la mission d’un autre chauffeur, sans révéler qu’elle existe', async () => {
      const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);

      const reponse = await changerStatutViaApi(
        application,
        cookieAutreChauffeur,
        mission.id,
        'IN_PROGRESS',
      );

      expect(reponse.status).toBe(404);
    });

    it('rejette un identifiant de mission mal formé', async () => {
      const reponse = await changerStatutViaApi(
        application,
        cookieChauffeur,
        "1' OR '1'='1",
        'IN_PROGRESS',
      );

      expect(reponse.status).toBe(400);
    });
  });

  describe('GET /api/drivers', () => {
    it('liste les chauffeurs actifs assignables pour le répartiteur', async () => {
      const reponse = await request(application)
        .get('/api/drivers')
        .set('Cookie', cookieRepartiteur);

      expect(reponse.status).toBe(200);
      expect(reponse.body).toEqual(
        expect.arrayContaining([{ id: chauffeur.id, email: chauffeur.email }]),
      );
    });

    it('n’est pas accessible à un chauffeur, qui n’a aucune visibilité sur les autres (RG1)', async () => {
      const reponse = await request(application).get('/api/drivers').set('Cookie', cookieChauffeur);

      expect(reponse.status).toBe(403);
    });
  });
});

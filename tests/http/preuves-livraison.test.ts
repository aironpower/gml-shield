import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import {
  changerStatutViaApi,
  creerMissionViaApi,
  deposerFichierViaApi,
  DOCUMENT_PDF_VALIDE,
  IMAGE_PNG_VALIDE,
  SCRIPT_DEGUISE_EN_IMAGE,
  type MissionCreee,
} from '../outils/missions-test.js';
import {
  creerCompteDeTest,
  obtenirCookieSession,
  ORIGINE_CLIENT,
} from '../outils/sessions-test.js';

const PNG = { contenu: IMAGE_PNG_VALIDE, nom: 'preuve.png', type: 'image/png' };

describe('Preuves de livraison : dépôt et téléchargement', () => {
  let application: Express;
  let cookieRepartiteur: string;
  let cookieChauffeur: string;
  let cookieAutreChauffeur: string;
  let idChauffeur: string;
  let mission: MissionCreee;

  beforeEach(async () => {
    application = creerApplication();
    const [repartiteur, chauffeur, autreChauffeur] = await Promise.all([
      creerCompteDeTest('DISPATCHER'),
      creerCompteDeTest('DRIVER'),
      creerCompteDeTest('DRIVER'),
    ]);
    [cookieRepartiteur, cookieChauffeur, cookieAutreChauffeur] = await Promise.all([
      obtenirCookieSession(application, repartiteur),
      obtenirCookieSession(application, chauffeur),
      obtenirCookieSession(application, autreChauffeur),
    ]);
    idChauffeur = chauffeur.id;
    mission = await creerMissionViaApi(application, cookieRepartiteur, idChauffeur);
    await changerStatutViaApi(application, cookieChauffeur, mission.id, 'IN_PROGRESS');
  });

  describe('POST /api/missions/:id/documents', () => {
    it('accepte une photo PNG du chauffeur assigné et retient son type réel', async () => {
      const reponse = await deposerFichierViaApi(application, cookieChauffeur, mission.id, PNG);

      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({
        mime_type: 'image/png',
        size_bytes: PNG.contenu.length,
      });
    });

    it('accepte un PDF même envoyé avec un type déclaré générique', async () => {
      const reponse = await deposerFichierViaApi(application, cookieChauffeur, mission.id, {
        contenu: DOCUMENT_PDF_VALIDE,
        nom: 'bon-de-livraison',
        type: 'application/octet-stream',
      });

      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({ mime_type: 'application/pdf' });
    });

    it('refuse un script déguisé en image (nom et type déclarés falsifiés)', async () => {
      const reponse = await deposerFichierViaApi(application, cookieChauffeur, mission.id, {
        contenu: SCRIPT_DEGUISE_EN_IMAGE,
        nom: 'photo.png',
        type: 'image/png',
      });

      expect(reponse.status).toBe(415);
    });

    it('refuse le dépôt sur la mission d’un autre chauffeur (RG4)', async () => {
      const reponse = await deposerFichierViaApi(
        application,
        cookieAutreChauffeur,
        mission.id,
        PNG,
      );

      expect(reponse.status).toBe(404);
    });

    it('refuse le dépôt par un répartiteur (RG4)', async () => {
      const reponse = await deposerFichierViaApi(application, cookieRepartiteur, mission.id, PNG);

      expect(reponse.status).toBe(403);
    });

    it('refuse un dépôt avant le début de la livraison (mission encore PENDING)', async () => {
      const missionEnAttente = await creerMissionViaApi(
        application,
        cookieRepartiteur,
        idChauffeur,
      );

      const reponse = await deposerFichierViaApi(
        application,
        cookieChauffeur,
        missionEnAttente.id,
        PNG,
      );

      expect(reponse.status).toBe(409);
    });

    it('refuse un fichier de plus de 10 Mo', async () => {
      const fichierEnorme = Buffer.concat([IMAGE_PNG_VALIDE, Buffer.alloc(10 * 1024 * 1024)]);

      const reponse = await deposerFichierViaApi(application, cookieChauffeur, mission.id, {
        ...PNG,
        contenu: fichierEnorme,
      });

      expect(reponse.status).toBe(413);
    });

    it('exige un fichier', async () => {
      const reponse = await request(application)
        .post(`/api/missions/${mission.id}/documents`)
        .set('Origin', ORIGINE_CLIENT)
        .set('Cookie', cookieChauffeur);

      expect(reponse.status).toBe(422);
    });

    it('refuse un champ de fichier inattendu', async () => {
      const reponse = await request(application)
        .post(`/api/missions/${mission.id}/documents`)
        .set('Origin', ORIGINE_CLIENT)
        .set('Cookie', cookieChauffeur)
        .attach('autre', IMAGE_PNG_VALIDE, 'preuve.png');

      expect(reponse.status).toBe(400);
    });
  });

  describe('GET /api/missions/:id/documents/:idDocument', () => {
    async function deposerPreuve(): Promise<string> {
      const reponse = await deposerFichierViaApi(application, cookieChauffeur, mission.id, PNG);
      return (reponse.body as { id: string }).id;
    }

    it('permet au répartiteur auteur de télécharger la preuve, en pièce jointe', async () => {
      const idDocument = await deposerPreuve();

      const reponse = await request(application)
        .get(`/api/missions/${mission.id}/documents/${idDocument}`)
        .set('Cookie', cookieRepartiteur);

      expect(reponse.status).toBe(200);
      expect(reponse.headers['content-type']).toBe('image/png');
      expect(reponse.headers['content-disposition']).toMatch(/^attachment;/);
      expect(reponse.headers['cache-control']).toBe('no-store');
      expect(Buffer.from(reponse.body as Buffer).equals(IMAGE_PNG_VALIDE)).toBe(true);
    });

    it('refuse le téléchargement à un autre répartiteur', async () => {
      const idDocument = await deposerPreuve();
      const autreRepartiteur = await creerCompteDeTest('DISPATCHER');
      const cookieAutreRepartiteur = await obtenirCookieSession(application, autreRepartiteur);

      const reponse = await request(application)
        .get(`/api/missions/${mission.id}/documents/${idDocument}`)
        .set('Cookie', cookieAutreRepartiteur);

      expect(reponse.status).toBe(404);
    });

    it('refuse le téléchargement au chauffeur (rôle DISPATCHER exigé)', async () => {
      const idDocument = await deposerPreuve();

      const reponse = await request(application)
        .get(`/api/missions/${mission.id}/documents/${idDocument}`)
        .set('Cookie', cookieChauffeur);

      expect(reponse.status).toBe(403);
    });

    it('liste la preuve déposée avec la mission du répartiteur', async () => {
      const idDocument = await deposerPreuve();

      const reponse = await request(application)
        .get('/api/missions')
        .set('Cookie', cookieRepartiteur);

      expect(reponse.body).toEqual([
        expect.objectContaining({
          id: mission.id,
          documents: [expect.objectContaining({ id: idDocument, mime_type: 'image/png' })],
        }),
      ]);
    });
  });
});

import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { creerApplication } from '../../src/http/application.js';
import { brancherServeurTempsReel } from '../../src/temps-reel/serveur-temps-reel.js';
import { creerMissionViaApi } from '../outils/missions-test.js';
import {
  creerCompteDeTest,
  obtenirCookieSession,
  ORIGINE_CLIENT,
  type CompteDeTest,
} from '../outils/sessions-test.js';

const DELAI_SILENCE_MS = 300;

describe('Notifications temps réel (WebSocket)', () => {
  let application: Express;
  let serveur: Server;
  let urlTempsReel: string;
  const connexionsOuvertes: WebSocket[] = [];

  beforeAll(async () => {
    application = creerApplication();
    serveur = createServer(application);
    brancherServeurTempsReel(serveur, ORIGINE_CLIENT);
    serveur.listen(0, '127.0.0.1');
    await once(serveur, 'listening');
    urlTempsReel = `ws://127.0.0.1:${String((serveur.address() as AddressInfo).port)}`;
  });

  afterEach(() => {
    connexionsOuvertes
      .splice(0)
      .filter((connexion) => connexion.readyState === WebSocket.OPEN)
      .forEach((connexion) => {
        connexion.terminate();
      });
  });

  afterAll(async () => {
    serveur.close();
    await once(serveur, 'close');
  });

  function seConnecter(enTetes: Record<string, string>, chemin = '/ws'): WebSocket {
    const connexion = new WebSocket(`${urlTempsReel}${chemin}`, { headers: enTetes });
    connexionsOuvertes.push(connexion);
    return connexion;
  }

  async function connecterEnTantQue(compte: CompteDeTest): Promise<WebSocket> {
    const cookie = await obtenirCookieSession(application, compte);
    const connexion = seConnecter({ cookie, origin: ORIGINE_CLIENT });
    await once(connexion, 'open');
    return connexion;
  }

  function attendreRefus(connexion: WebSocket): Promise<number | undefined> {
    return new Promise((resoudre) => {
      connexion.on('unexpected-response', (requete, reponse) => {
        requete.destroy();
        resoudre(reponse.statusCode);
      });
    });
  }

  function recevoirMessages(connexion: WebSocket): unknown[] {
    const messages: unknown[] = [];
    connexion.on('message', (donnees: Buffer) => messages.push(JSON.parse(donnees.toString())));
    return messages;
  }

  it('pousse NEW_MISSION au seul chauffeur assigné, sans le code secret', async () => {
    const [repartiteur, chauffeur, autreChauffeur] = await Promise.all([
      creerCompteDeTest('DISPATCHER'),
      creerCompteDeTest('DRIVER'),
      creerCompteDeTest('DRIVER'),
    ]);
    const messagesChauffeur = recevoirMessages(await connecterEnTantQue(chauffeur));
    const messagesAutreChauffeur = recevoirMessages(await connecterEnTantQue(autreChauffeur));
    const cookieRepartiteur = await obtenirCookieSession(application, repartiteur);

    const mission = await creerMissionViaApi(application, cookieRepartiteur, chauffeur.id);
    await new Promise((resoudre) => setTimeout(resoudre, DELAI_SILENCE_MS));

    expect(messagesChauffeur).toEqual([
      {
        type: 'NEW_MISSION',
        mission: expect.objectContaining({ id: mission.id, title: 'Livraison IRM' }) as unknown,
      },
    ]);
    expect(JSON.stringify(messagesChauffeur)).not.toContain('QUAI-4821');
    expect(messagesAutreChauffeur).toEqual([]);
  });

  it('refuse la connexion sans session (401)', async () => {
    const connexion = seConnecter({ origin: ORIGINE_CLIENT });

    await expect(attendreRefus(connexion)).resolves.toBe(401);
  });

  it('refuse la connexion ouverte depuis un site tiers (403), même avec un cookie valide', async () => {
    const cookie = await obtenirCookieSession(application, await creerCompteDeTest('DRIVER'));
    const connexion = seConnecter({ cookie, origin: 'https://site-malveillant.example' });

    await expect(attendreRefus(connexion)).resolves.toBe(403);
  });

  it('refuse un chemin autre que /ws (404)', async () => {
    const connexion = seConnecter({ origin: ORIGINE_CLIENT }, '/autre');

    await expect(attendreRefus(connexion)).resolves.toBe(404);
  });

  it('refuse un jeton révoqué par une déconnexion (401)', async () => {
    const cookie = await obtenirCookieSession(application, await creerCompteDeTest('DRIVER'));
    await request(application)
      .post('/api/auth/logout')
      .set('Origin', ORIGINE_CLIENT)
      .set('Cookie', cookie);

    const connexion = seConnecter({ cookie, origin: ORIGINE_CLIENT });

    await expect(attendreRefus(connexion)).resolves.toBe(401);
  });
});

import { randomBytes } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import { poolConnexions } from '../../src/infrastructure/base-de-donnees/pool-connexions.js';
import {
  creerCompteDeTest,
  obtenirCookieSession,
  ORIGINE_CLIENT,
} from '../outils/sessions-test.js';

interface TraceLue {
  user_id: string | null;
  action: string;
  http_status: number;
}

/** Adresse IPv6 de documentation unique : isole les traces de chaque test. */
function adresseIpUnique(): string {
  return `2001:db8::${randomBytes(2).toString('hex')}:${randomBytes(2).toString('hex')}`;
}

async function lireTraces(adresseIp: string): Promise<TraceLue[]> {
  const resultat = await poolConnexions.query<TraceLue>(
    'SELECT user_id, action, http_status FROM audit_logs WHERE ip_address = $1::inet ORDER BY id',
    [adresseIp],
  );
  return resultat.rows;
}

/** L'écriture d'audit est asynchrone : on attend qu'elle soit visible en base. */
async function attendreTraces(adresseIp: string, nombreAttendu: number): Promise<TraceLue[]> {
  return vi.waitFor(async () => {
    const traces = await lireTraces(adresseIp);
    expect(traces).toHaveLength(nombreAttendu);
    return traces;
  });
}

describe('Journal d’audit automatique', () => {
  let application: Express;
  let adresseIp: string;

  beforeEach(() => {
    application = creerApplication({
      nombreProxysDeConfiance: 1,
      origineAutorisee: ORIGINE_CLIENT,
    });
    adresseIp = adresseIpUnique();
  });

  it('trace un échec de connexion avec l’adresse IP réelle du client et le statut 401', async () => {
    await request(application)
      .post('/api/auth/login')
      .set('X-Forwarded-For', adresseIp)
      .set('Origin', ORIGINE_CLIENT)
      .send({ email: 'inconnu@gml.test', password: 'mauvais' });

    const [trace] = await attendreTraces(adresseIp, 1);

    expect(trace).toEqual({ user_id: null, action: 'POST /api/auth/login', http_status: 401 });
  });

  it('attribue une connexion réussie à l’utilisateur qui vient de s’authentifier', async () => {
    const chauffeur = await creerCompteDeTest('DRIVER');

    await request(application)
      .post('/api/auth/login')
      .set('X-Forwarded-For', adresseIp)
      .set('Origin', ORIGINE_CLIENT)
      .send({ email: chauffeur.email, password: chauffeur.motDePasse });

    const [trace] = await attendreTraces(adresseIp, 1);

    expect(trace).toEqual({
      user_id: chauffeur.id,
      action: 'POST /api/auth/login',
      http_status: 200,
    });
  });

  it('associe l’action à l’identité de l’utilisateur connecté', async () => {
    const repartiteur = await creerCompteDeTest('DISPATCHER');
    const cookie = await obtenirCookieSession(application, repartiteur);

    await request(application)
      .post('/api/auth/logout')
      .set('X-Forwarded-For', adresseIp)
      .set('Origin', ORIGINE_CLIENT)
      .set('Cookie', cookie);

    const [trace] = await attendreTraces(adresseIp, 1);

    expect(trace).toEqual({
      user_id: repartiteur.id,
      action: 'POST /api/auth/logout',
      http_status: 204,
    });
  });

  it('trace aussi une tentative CSRF refusée', async () => {
    await request(application)
      .post('/api/auth/login')
      .set('X-Forwarded-For', adresseIp)
      .set('Origin', 'https://site-malveillant.example')
      .send({});

    const [trace] = await attendreTraces(adresseIp, 1);

    expect(trace?.http_status).toBe(403);
  });

  it('n’enregistre pas les paramètres d’URL, qui pourraient contenir des données sensibles', async () => {
    await request(application)
      .post('/api/auth/login?password=secret')
      .set('X-Forwarded-For', adresseIp)
      .set('Origin', ORIGINE_CLIENT)
      .send({});

    const [trace] = await attendreTraces(adresseIp, 1);

    expect(trace?.action).toBe('POST /api/auth/login');
  });

  it('ne trace pas les lectures, qui ne modifient aucune donnée', async () => {
    await request(application).get('/api/sante').set('X-Forwarded-For', adresseIp);
    await request(application)
      .post('/api/auth/login')
      .set('X-Forwarded-For', adresseIp)
      .set('Origin', ORIGINE_CLIENT)
      .send({});

    const traces = await attendreTraces(adresseIp, 1);

    expect(traces.map((trace) => trace.action)).toEqual(['POST /api/auth/login']);
  });
});

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import { creerCompteDeTest, obtenirCookieSession } from '../outils/sessions-test.js';

describe('Client web', () => {
  const application = creerApplication();

  it('sert la page d’accueil du client', async () => {
    const reponse = await request(application).get('/');

    expect(reponse.status).toBe(200);
    expect(reponse.headers['content-type']).toMatch(/text\/html/);
    expect(reponse.text).toContain('GML-SHIELD');
  });

  it('interdit les scripts tiers ou en ligne et limite les connexions à notre serveur (CSP)', async () => {
    const reponse = await request(application).get('/');
    const politique = String(reponse.headers['content-security-policy']);

    expect(politique).toContain("script-src 'self'");
    expect(politique).toContain("connect-src 'self' ws://localhost:3000");
  });

  it('sert les scripts du client', async () => {
    const reponse = await request(application).get('/js/application.js');

    expect(reponse.status).toBe(200);
    expect(reponse.headers['content-type']).toMatch(/javascript/);
  });
});

describe('GET /api/audit-logs', () => {
  const application = creerApplication();

  it('présente à l’Admin Sécurité les dernières traces, la plus récente en premier', async () => {
    const administrateur = await creerCompteDeTest('ADMIN');
    const cookie = await obtenirCookieSession(application, administrateur);

    const reponse = await request(application).get('/api/audit-logs').set('Cookie', cookie);
    const traces = reponse.body as { id: string; action: string }[];

    expect(reponse.status).toBe(200);
    expect(traces[0]).toMatchObject({ action: expect.any(String) as unknown });
    expect(Number(traces[0]?.id)).toBeGreaterThan(Number(traces.at(-1)?.id));
  });

  it('est réservé à l’Admin Sécurité', async () => {
    const repartiteur = await creerCompteDeTest('DISPATCHER');
    const cookie = await obtenirCookieSession(application, repartiteur);

    const reponse = await request(application).get('/api/audit-logs').set('Cookie', cookie);

    expect(reponse.status).toBe(403);
  });
});

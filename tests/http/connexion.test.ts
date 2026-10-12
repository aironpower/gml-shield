import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import {
  creerCompteDeTest,
  lireCookiesRecus,
  ORIGINE_CLIENT,
  type CompteDeTest,
} from '../outils/sessions-test.js';

const REPONSE_IDENTIFIANTS_INVALIDES = { error: 'Identifiants invalides' };

describe('POST /api/auth/login', () => {
  let application: Express;
  let chauffeur: CompteDeTest;

  beforeEach(async () => {
    application = creerApplication();
    chauffeur = await creerCompteDeTest('DRIVER');
  });

  function tenterConnexion(identifiants: object): request.Test {
    return request(application)
      .post('/api/auth/login')
      .set('Origin', ORIGINE_CLIENT)
      .send(identifiants);
  }

  it('ouvre une session et renvoie l’utilisateur sans exposer le jeton dans le corps', async () => {
    const reponse = await tenterConnexion({
      email: chauffeur.email,
      password: chauffeur.motDePasse,
    });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      user: { id: chauffeur.id, email: chauffeur.email, role: 'DRIVER' },
    });
    expect(JSON.stringify(reponse.body)).not.toMatch(/eyJ/);
  });

  it('dépose le jeton dans un cookie HttpOnly et SameSite=Strict (prévention XSS et CSRF)', async () => {
    const reponse = await tenterConnexion({
      email: chauffeur.email,
      password: chauffeur.motDePasse,
    });

    const [cookieSession] = lireCookiesRecus(reponse);
    expect(cookieSession).toMatch(/^gml_session=eyJ/);
    expect(cookieSession).toContain('HttpOnly');
    expect(cookieSession).toContain('SameSite=Strict');
  });

  it('accepte l’adresse e-mail quelle que soit sa casse', async () => {
    const reponse = await tenterConnexion({
      email: chauffeur.email.toUpperCase(),
      password: chauffeur.motDePasse,
    });

    expect(reponse.status).toBe(200);
  });

  it('refuse un mauvais mot de passe', async () => {
    const reponse = await tenterConnexion({ email: chauffeur.email, password: 'mauvais' });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REPONSE_IDENTIFIANTS_INVALIDES);
  });

  it('répond exactement comme pour un mauvais mot de passe quand le compte n’existe pas', async () => {
    const reponse = await tenterConnexion({ email: 'inconnu@gml.test', password: 'peu importe' });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REPONSE_IDENTIFIANTS_INVALIDES);
  });

  it('refuse un compte désactivé même avec le bon mot de passe', async () => {
    const compteDesactive = await creerCompteDeTest('DRIVER', false);

    const reponse = await tenterConnexion({
      email: compteDesactive.email,
      password: compteDesactive.motDePasse,
    });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REPONSE_IDENTIFIANTS_INVALIDES);
  });

  it('rejette une injection SQL dans l’adresse e-mail avant toute requête en base', async () => {
    const reponse = await tenterConnexion({ email: "' OR '1'='1' --", password: 'x' });

    expect(reponse.status).toBe(400);
    expect(reponse.body).toMatchObject({ error: 'Données invalides' });
  });

  it('traite une injection SQL dans le mot de passe comme un simple texte erroné', async () => {
    const reponse = await tenterConnexion({ email: chauffeur.email, password: "' OR 1=1 --" });

    expect(reponse.status).toBe(401);
  });

  it('refuse un mot de passe démesuré qui servirait à saturer le serveur', async () => {
    const reponse = await tenterConnexion({ email: chauffeur.email, password: 'x'.repeat(129) });

    expect(reponse.status).toBe(400);
  });

  it('bloque l’adresse IP après cinq échecs consécutifs (force brute)', async () => {
    for (let tentative = 1; tentative <= 5; tentative += 1) {
      await tenterConnexion({ email: chauffeur.email, password: `essai-${String(tentative)}` });
    }

    const reponse = await tenterConnexion({
      email: chauffeur.email,
      password: chauffeur.motDePasse,
    });

    expect(reponse.status).toBe(429);
  });

  it('refuse une requête sans en-tête Origin (CSRF)', async () => {
    const reponse = await request(application)
      .post('/api/auth/login')
      .send({ email: chauffeur.email, password: chauffeur.motDePasse });

    expect(reponse.status).toBe(403);
  });

  it('refuse une requête émise depuis un site tiers (CSRF)', async () => {
    const reponse = await request(application)
      .post('/api/auth/login')
      .set('Origin', 'https://site-malveillant.example')
      .send({ email: chauffeur.email, password: chauffeur.motDePasse });

    expect(reponse.status).toBe(403);
    expect(reponse.body).toEqual({ error: 'Origine de la requête non autorisée' });
  });
});

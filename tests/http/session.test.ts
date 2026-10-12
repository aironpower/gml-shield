import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { SignJWT, UnsecuredJWT } from 'jose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import {
  creerCompteDeTest,
  desactiverCompte,
  lireCookiesRecus,
  obtenirCookieSession,
  ORIGINE_CLIENT,
  type CompteDeTest,
} from '../outils/sessions-test.js';

const SECRET_DE_TEST = new TextEncoder().encode(process.env.SECRET_JWT);
const REPONSE_SESSION_INVALIDE = { error: 'Session absente, invalide ou expirée' };

function forgerJeton(idUtilisateur: string, cle: Uint8Array, expiration: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(idUtilisateur)
    .setJti(randomUUID())
    .setIssuer('gml-shield')
    .setAudience('gml-shield-api')
    .setExpirationTime(expiration)
    .sign(cle);
}

describe('Session : jeton, révocation et désactivation', () => {
  let application: Express;
  let chauffeur: CompteDeTest;

  beforeEach(async () => {
    application = creerApplication();
    chauffeur = await creerCompteDeTest('DRIVER');
  });

  function consulterSession(cookie?: string): request.Test {
    const requete = request(application).get('/api/auth/me');
    return cookie === undefined ? requete : requete.set('Cookie', cookie);
  }

  it('reconnaît l’utilisateur à partir du cookie de session', async () => {
    const cookie = await obtenirCookieSession(application, chauffeur);

    const reponse = await consulterSession(cookie);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ user: { id: chauffeur.id, role: 'DRIVER' } });
  });

  it('refuse l’accès sans cookie de session', async () => {
    const reponse = await consulterSession();

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REPONSE_SESSION_INVALIDE);
  });

  it('refuse un jeton signé avec une autre clé', async () => {
    const cleDeLAttaquant = new TextEncoder().encode('cle-inventee-par-un-attaquant-0123456789');
    const jetonForge = await forgerJeton(chauffeur.id, cleDeLAttaquant, '15m');

    const reponse = await consulterSession(`gml_session=${jetonForge}`);

    expect(reponse.status).toBe(401);
  });

  it('refuse un jeton non signé déclarant l’algorithme « none »', async () => {
    const jetonNonSigne = new UnsecuredJWT({})
      .setSubject(chauffeur.id)
      .setJti(randomUUID())
      .setIssuer('gml-shield')
      .setAudience('gml-shield-api')
      .setExpirationTime('15m')
      .encode();

    const reponse = await consulterSession(`gml_session=${jetonNonSigne}`);

    expect(reponse.status).toBe(401);
  });

  it('refuse un jeton authentique mais expiré', async () => {
    const jetonExpire = await forgerJeton(chauffeur.id, SECRET_DE_TEST, '1 minute ago');

    const reponse = await consulterSession(`gml_session=${jetonExpire}`);

    expect(reponse.status).toBe(401);
  });

  it('refuse un jeton authentique dont l’utilisateur n’existe pas', async () => {
    const jetonOrphelin = await forgerJeton(randomUUID(), SECRET_DE_TEST, '15m');

    const reponse = await consulterSession(`gml_session=${jetonOrphelin}`);

    expect(reponse.status).toBe(401);
  });

  it('refuse un jeton authentique dépourvu d’identifiant utilisateur', async () => {
    const jetonSansSujet = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(randomUUID())
      .setIssuer('gml-shield')
      .setAudience('gml-shield-api')
      .setExpirationTime('15m')
      .sign(SECRET_DE_TEST);

    const reponse = await consulterSession(`gml_session=${jetonSansSujet}`);

    expect(reponse.status).toBe(401);
  });

  it('révoque le jeton à la déconnexion : sa réutilisation est refusée', async () => {
    const cookie = await obtenirCookieSession(application, chauffeur);

    const deconnexion = await request(application)
      .post('/api/auth/logout')
      .set('Origin', ORIGINE_CLIENT)
      .set('Cookie', cookie);
    const reutilisation = await consulterSession(cookie);

    expect(deconnexion.status).toBe(204);
    expect(lireCookiesRecus(deconnexion).join()).toMatch(/gml_session=;/);
    expect(reutilisation.status).toBe(401);
  });

  it('coupe immédiatement l’accès d’un compte désactivé pendant sa session', async () => {
    const cookie = await obtenirCookieSession(application, chauffeur);

    await desactiverCompte(chauffeur.id);
    const reponse = await consulterSession(cookie);

    expect(reponse.status).toBe(401);
  });

  it('refuse la déconnexion sans session', async () => {
    const reponse = await request(application)
      .post('/api/auth/logout')
      .set('Origin', ORIGINE_CLIENT);

    expect(reponse.status).toBe(401);
  });
});

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { repondreErreurInattendue } from '../../src/http/intercepteurs/gestion-erreurs.js';

function creerApplicationQuiLeve(erreurLevee: unknown): express.Express {
  const application = express();
  application.get('/echec', () => {
    throw erreurLevee;
  });
  application.use(repondreErreurInattendue);
  return application;
}

describe('Gestion des erreurs inattendues', () => {
  it('masque le message technique d’une erreur serveur', async () => {
    const application = creerApplicationQuiLeve(new Error('relation "users" does not exist'));

    const reponse = await request(application).get('/echec');

    expect(reponse.status).toBe(500);
    expect(reponse.body).toEqual({ erreur: 'Erreur interne du serveur' });
    expect(JSON.stringify(reponse.body)).not.toContain('users');
  });

  it('traite une valeur levée qui n’est pas un objet comme une erreur serveur', async () => {
    const application = creerApplicationQuiLeve('chaine levee');

    const reponse = await request(application).get('/echec');

    expect(reponse.status).toBe(500);
  });

  it('ne laisse pas un statut 5xx porté par l’erreur passer pour une erreur client', async () => {
    const application = creerApplicationQuiLeve(Object.assign(new Error('panne'), { status: 503 }));

    const reponse = await request(application).get('/echec');

    expect(reponse.status).toBe(500);
  });

  it('renvoie un message générique pour une erreur client sans message dédié', async () => {
    const application = creerApplicationQuiLeve(Object.assign(new Error('x'), { status: 422 }));

    const reponse = await request(application).get('/echec');

    expect(reponse.status).toBe(422);
    expect(reponse.body).toEqual({ erreur: 'Requête invalide' });
  });
});

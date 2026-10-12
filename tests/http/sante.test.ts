import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { creerApplication } from '../../src/http/application.js';

describe('Socle HTTP', () => {
  const application = creerApplication();

  it('répond que le service est disponible', async () => {
    const reponse = await request(application).get('/api/sante');

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ statut: 'ok' });
  });

  it('ajoute les en-têtes de sécurité et masque la technologie du serveur', async () => {
    const reponse = await request(application).get('/api/sante');

    expect(reponse.headers['content-security-policy']).toBeDefined();
    expect(reponse.headers['x-content-type-options']).toBe('nosniff');
    expect(reponse.headers['x-powered-by']).toBeUndefined();
  });

  it('renvoie une erreur 404 en JSON sans détail technique pour une route inconnue', async () => {
    const reponse = await request(application).get('/api/inexistant');

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({ erreur: 'Ressource introuvable' });
  });

  it('refuse un corps JSON dépassant la taille autorisée', async () => {
    const corpsTropVolumineux = { donnees: 'x'.repeat(200_000) };

    const reponse = await request(application).post('/api/sante').send(corpsTropVolumineux);

    expect(reponse.status).toBe(413);
  });

  it('renvoie une erreur 400 sans détail technique pour un JSON mal formé', async () => {
    const reponse = await request(application)
      .post('/api/sante')
      .set('Content-Type', 'application/json')
      .send('{"json": invalide');

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({ erreur: 'Requête mal formée' });
  });
});

import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import type { RoleUtilisateur } from '../../src/domaine/utilisateur.js';
import { poolConnexions } from '../../src/infrastructure/base-de-donnees/pool-connexions.js';
import { hacherMotDePasse } from '../../src/infrastructure/securite/hachage-mots-de-passe.js';
import { premiereLigne } from './base-de-donnees-test.js';

export const ORIGINE_CLIENT = 'http://localhost:3000';

export interface CompteDeTest {
  id: string;
  email: string;
  motDePasse: string;
}

/** Crée un compte réel en base (adresse unique) pour les tests passant par l'API HTTP. */
export async function creerCompteDeTest(
  role: RoleUtilisateur,
  estActif = true,
): Promise<CompteDeTest> {
  const email = `${role.toLowerCase()}-${randomUUID()}@gml.test`;
  const motDePasse = `Mdp-${randomUUID()}`;
  const resultat = await poolConnexions.query<{ id: string }>(
    'INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
    [email, await hacherMotDePasse(motDePasse), role, estActif],
  );
  return { id: premiereLigne(resultat).id, email, motDePasse };
}

export async function desactiverCompte(idUtilisateur: string): Promise<void> {
  await poolConnexions.query('UPDATE users SET is_active = false WHERE id = $1', [idUtilisateur]);
}

/** Se connecte via l'API et renvoie le cookie de session prêt à être renvoyé. */
export async function obtenirCookieSession(
  application: Express,
  compte: CompteDeTest,
): Promise<string> {
  const reponse = await request(application)
    .post('/api/auth/login')
    .set('Origin', ORIGINE_CLIENT)
    .send({ email: compte.email, password: compte.motDePasse });

  const cookieSession = lireCookiesRecus(reponse).find((cookie) =>
    cookie.startsWith('gml_session='),
  );
  if (reponse.status !== 200 || cookieSession === undefined) {
    throw new Error(`Connexion de test impossible (statut ${String(reponse.status)})`);
  }
  return cookieSession.split(';')[0] ?? '';
}

export function lireCookiesRecus(reponse: request.Response): string[] {
  const enTete: unknown = reponse.headers['set-cookie'];
  return Array.isArray(enTete) ? enTete.map(String) : [];
}

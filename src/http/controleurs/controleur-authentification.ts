import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  fermerSession,
  ouvrirSession,
  type SessionUtilisateur,
} from '../../services/service-authentification.js';
import {
  NOM_COOKIE_SESSION,
  optionsCookieSession,
  optionsEffacementCookieSession,
} from '../cookie-session.js';
import { obtenirSession } from '../intercepteurs/exiger-session.js';

/**
 * Pourquoi borner la longueur du mot de passe : Argon2 est volontairement coûteux ; sans
 * limite, un attaquant pourrait envoyer des mots de passe de plusieurs mégaoctets pour
 * saturer le serveur (déni de service).
 */
const schemaIdentifiants = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

/**
 * Le jeton part uniquement dans le cookie HttpOnly, jamais dans le corps de la réponse :
 * le JavaScript du client n'y a donc jamais accès.
 * La session est rattachée à la requête pour que le journal d'audit attribue la connexion
 * réussie à son auteur (NIS2 art. 21 : action associée à une identité).
 */
export async function connecter(requete: Request, reponse: Response): Promise<void> {
  const { email, password } = schemaIdentifiants.parse(requete.body);
  const session = await ouvrirSession(email, password);
  requete.sessionUtilisateur = session;

  reponse.cookie(NOM_COOKIE_SESSION, session.jeton, optionsCookieSession(session.expiration));
  reponse.json(decrireSession(session));
}

export async function deconnecter(requete: Request, reponse: Response): Promise<void> {
  await fermerSession(obtenirSession(requete));

  reponse.clearCookie(NOM_COOKIE_SESSION, optionsEffacementCookieSession());
  reponse.status(204).end();
}

export function decrireSessionCourante(requete: Request, reponse: Response): void {
  reponse.json(decrireSession(obtenirSession(requete)));
}

function decrireSession(session: SessionUtilisateur): object {
  return { user: session.utilisateur, expires_at: session.expiration.toISOString() };
}

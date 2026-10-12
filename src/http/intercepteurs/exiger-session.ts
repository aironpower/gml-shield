import type { NextFunction, Request, Response } from 'express';
import { ErreurAuthentification } from '../../domaine/erreurs.js';
import {
  verifierSession,
  type SessionUtilisateur,
} from '../../services/service-authentification.js';
import { lireJetonDuCookie } from '../cookie-session.js';

/**
 * Bloque toute requête sans session valide (401) et attache l'utilisateur à la requête.
 * Placé devant chaque route protégée : une route qui l'oublie est publique, d'où la règle
 * du guide qualité imposant un test « sans session → 401 » pour chaque route protégée.
 */
export async function exigerSession(
  requete: Request,
  _reponse: Response,
  suite: NextFunction,
): Promise<void> {
  requete.sessionUtilisateur = await verifierSession(lireJetonDuCookie(requete));
  suite();
}

/**
 * Renvoie la session établie par exigerSession.
 * Lève une erreur 401 si la route a été déclarée sans exigerSession : un oubli de
 * configuration bloque l'accès au lieu de l'ouvrir (« fail-closed »).
 */
export function obtenirSession(requete: Request): SessionUtilisateur {
  if (requete.sessionUtilisateur === undefined) {
    throw new ErreurAuthentification('Authentification requise');
  }
  return requete.sessionUtilisateur;
}

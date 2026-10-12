import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const FENETRE_OBSERVATION_MS = 15 * 60 * 1000;
const ECHECS_AUTORISES_PAR_FENETRE = 5;

/**
 * Limite les échecs de connexion par adresse IP (protection contre la force brute).
 *
 * Pourquoi ne compter que les échecs : un chauffeur qui se reconnecte souvent ne doit pas
 * être bloqué ; seul un enchaînement d'erreurs de mot de passe est suspect.
 * Limite assumée : le compteur est en mémoire, donc propre à une instance du serveur et
 * remis à zéro au redémarrage (un stockage partagé sera nécessaire en cas de mise à l'échelle).
 */
export function creerLimiteurTentativesConnexion(): RequestHandler {
  return rateLimit({
    windowMs: FENETRE_OBSERVATION_MS,
    limit: ECHECS_AUTORISES_PAR_FENETRE,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_requete, reponse) => {
      reponse.status(429).json({ error: 'Trop de tentatives de connexion, réessayez plus tard' });
    },
  });
}

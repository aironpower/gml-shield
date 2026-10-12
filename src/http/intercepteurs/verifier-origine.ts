import type { RequestHandler } from 'express';
import { ErreurAccesRefuse } from '../../domaine/erreurs.js';

const METHODES_SANS_EFFET = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuse toute requête modifiant des données si elle ne provient pas du client GML-SHIELD.
 *
 * Pourquoi en plus du cookie SameSite : c'est la seconde barrière anti-CSRF recommandée par
 * l'OWASP (vérification de l'en-tête Origin, que le navigateur renseigne lui-même et qu'un
 * site tiers ne peut pas falsifier). Une requête sans en-tête Origin est refusée.
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */
export function verifierOrigine(origineAutorisee: string): RequestHandler {
  return (requete, _reponse, suite) => {
    if (METHODES_SANS_EFFET.has(requete.method) || requete.get('origin') === origineAutorisee) {
      suite();
      return;
    }
    throw new ErreurAccesRefuse('Origine de la requête non autorisée');
  };
}

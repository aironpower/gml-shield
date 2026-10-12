import express, { type Express } from 'express';
import helmet from 'helmet';
import { creerRoutesSante } from './routes/routes-sante.js';
import {
  repondreErreurInattendue,
  repondreRouteIntrouvable,
} from './intercepteurs/gestion-erreurs.js';

const TAILLE_MAXIMALE_CORPS_JSON = '100kb';

/**
 * Assemble la chaîne de traitement HTTP sans démarrer d'écoute réseau.
 *
 * Pourquoi une fabrique séparée de serveur.ts : les tests d'intégration instancient
 * l'application en mémoire (supertest) sans ouvrir de port ni dépendre de l'environnement.
 * L'ordre des intercepteurs est significatif : sécurité d'abord, routes ensuite, erreurs en dernier.
 */
export function creerApplication(): Express {
  const application = express();

  application.disable('x-powered-by');
  application.use(helmet());
  application.use(express.json({ limit: TAILLE_MAXIMALE_CORPS_JSON }));

  application.use('/api/sante', creerRoutesSante());

  application.use(repondreRouteIntrouvable);
  application.use(repondreErreurInattendue);

  return application;
}

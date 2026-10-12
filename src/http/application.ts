import express, { type Express } from 'express';
import helmet from 'helmet';
import { creerRoutesSante } from './routes/routes-sante.js';
import {
  repondreErreurInattendue,
  repondreRouteIntrouvable,
} from './intercepteurs/gestion-erreurs.js';

const TAILLE_MAXIMALE_CORPS_JSON = '100kb';

export interface OptionsApplication {
  /**
   * Nombre de reverse proxys placés devant le serveur (0 en local, 1 derrière Render).
   *
   * Pourquoi un nombre et jamais `true` : avec `true`, Express ferait confiance à toute la
   * chaîne X-Forwarded-For, qu'un client peut écrire lui-même ; il pourrait alors usurper
   * n'importe quelle adresse IP dans le journal d'audit et contourner la limitation de débit.
   * Avec un nombre N, seule l'adresse ajoutée par le N-ième proxy de confiance est retenue.
   */
  nombreProxysDeConfiance: number;
}

const OPTIONS_PAR_DEFAUT: OptionsApplication = { nombreProxysDeConfiance: 0 };

/**
 * Assemble la chaîne de traitement HTTP sans démarrer d'écoute réseau.
 *
 * Pourquoi une fabrique séparée de serveur.ts : les tests d'intégration instancient
 * l'application en mémoire (supertest) sans ouvrir de port ni dépendre de l'environnement.
 * L'ordre des intercepteurs est significatif : sécurité d'abord, routes ensuite, erreurs en dernier.
 */
export function creerApplication(options: OptionsApplication = OPTIONS_PAR_DEFAUT): Express {
  const application = express();

  application.set('trust proxy', options.nombreProxysDeConfiance);
  application.disable('x-powered-by');
  application.use(helmet());
  application.use(express.json({ limit: TAILLE_MAXIMALE_CORPS_JSON }));

  application.use('/api/sante', creerRoutesSante());

  application.use(repondreRouteIntrouvable);
  application.use(repondreErreurInattendue);

  return application;
}

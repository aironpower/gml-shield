import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { environnement } from '../configuration/environnement.js';
import { creerRoutesAuthentification } from './routes/routes-authentification.js';
import { creerRoutesSante } from './routes/routes-sante.js';
import {
  repondreErreurInattendue,
  repondreRouteIntrouvable,
} from './intercepteurs/gestion-erreurs.js';
import { journaliserAudit } from './intercepteurs/journaliser-audit.js';
import { verifierOrigine } from './intercepteurs/verifier-origine.js';

const TAILLE_MAXIMALE_CORPS_JSON = '100kb';

z.config(z.locales.fr());

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
  /** Seule origine autorisée à envoyer des requêtes modifiant des données (anti-CSRF). */
  origineAutorisee: string;
}

function lireOptionsDepuisEnvironnement(): OptionsApplication {
  return {
    nombreProxysDeConfiance: environnement.NOMBRE_PROXYS_DE_CONFIANCE,
    origineAutorisee: environnement.ORIGINE_AUTORISEE,
  };
}

/**
 * Assemble la chaîne de traitement HTTP sans démarrer d'écoute réseau.
 *
 * Pourquoi une fabrique séparée de serveur.ts : les tests d'intégration instancient
 * l'application en mémoire (supertest) sans ouvrir de port.
 *
 * L'ordre des intercepteurs est une décision de sécurité :
 * 1. en-têtes de sécurité, appliqués à toutes les réponses, y compris les erreurs ;
 * 2. journal d'audit avant tout filtrage, pour tracer aussi les requêtes refusées ;
 * 3. lecture du corps et des cookies ;
 * 4. contrôle d'origine anti-CSRF avant d'atteindre la moindre route ;
 * 5. routes, puis gestion des erreurs en dernier.
 */
export function creerApplication(
  options: OptionsApplication = lireOptionsDepuisEnvironnement(),
): Express {
  const application = express();

  application.set('trust proxy', options.nombreProxysDeConfiance);
  application.disable('x-powered-by');
  application.use(helmet());
  application.use(journaliserAudit);
  application.use(express.json({ limit: TAILLE_MAXIMALE_CORPS_JSON }));
  application.use(cookieParser());
  application.use(verifierOrigine(options.origineAutorisee));

  application.use('/api/sante', creerRoutesSante());
  application.use('/api/auth', creerRoutesAuthentification());

  application.use(repondreRouteIntrouvable);
  application.use(repondreErreurInattendue);

  return application;
}

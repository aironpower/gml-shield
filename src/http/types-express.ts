import type { SessionUtilisateur } from '../services/service-authentification.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Renseignée par l'intercepteur exigerSession sur les routes protégées. */
    sessionUtilisateur?: SessionUtilisateur;
  }
}

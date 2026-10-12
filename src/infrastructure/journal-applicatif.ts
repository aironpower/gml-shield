import { pino } from 'pino';
import { environnement } from '../configuration/environnement.js';

/**
 * Journal technique de l'application (sortie standard, format JSON).
 *
 * Pourquoi « redact » : les en-têtes d'authentification, cookies et mots de passe ne doivent
 * jamais apparaître dans les journaux, même en cas d'erreur, car les journaux sont lus par
 * des personnes qui n'ont pas à connaître ces secrets (exigence Annexe 1).
 * Ce journal technique est distinct du journal d'audit métier stocké en base.
 */
export const journalApplicatif = pino({
  level: environnement.NIVEAU_JOURNAL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.mot_de_passe',
      '*.secret_code',
    ],
    censor: '[MASQUÉ]',
  },
});

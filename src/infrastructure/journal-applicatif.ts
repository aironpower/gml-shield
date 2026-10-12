import { pino, type DestinationStream, type Logger } from 'pino';
import { environnement } from '../configuration/environnement.js';

const CHAMPS_SECRETS = ['password', 'mot_de_passe', 'secret_code', 'token', 'jeton'] as const;

/**
 * Emplacements où un champ secret peut apparaître dans un objet journalisé.
 * Pourquoi une liste explicite : le joker de pino (`*.champ`) ne couvre qu'un seul niveau
 * de profondeur ; un corps de requête journalisé (`req.body.password`) serait sinon écrit
 * en clair.
 */
const PREFIXES_SECRETS = ['', '*.', 'body.', 'req.body.', 'requete.corps.'] as const;

const CHEMINS_MASQUES = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...PREFIXES_SECRETS.flatMap((prefixe) => CHAMPS_SECRETS.map((champ) => prefixe + champ)),
];

export const VALEUR_MASQUEE = '[MASQUÉ]';

/**
 * Crée un journal technique (sortie standard par défaut, format JSON).
 *
 * Pourquoi « redact » : les en-têtes d'authentification, cookies, mots de passe et codes
 * d'accès ne doivent jamais apparaître dans les journaux, même en cas d'erreur, car les
 * journaux sont lus par des personnes qui n'ont pas à connaître ces secrets (Annexe 1).
 * Ce journal technique est distinct du journal d'audit métier stocké en base.
 */
export function creerJournalApplicatif(
  niveau: string,
  destination: DestinationStream = process.stdout,
): Logger {
  return pino(
    { level: niveau, redact: { paths: CHEMINS_MASQUES, censor: VALEUR_MASQUEE } },
    destination,
  );
}

export const journalApplicatif = creerJournalApplicatif(environnement.NIVEAU_JOURNAL);

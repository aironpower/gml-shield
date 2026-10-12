import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ErreurApplicative } from '../../domaine/erreurs.js';
import { journalApplicatif } from '../../infrastructure/journal-applicatif.js';

const MESSAGES_ERREURS_CLIENT: Readonly<Record<number, string>> = {
  400: 'Requête mal formée',
  413: 'Corps de requête trop volumineux',
  415: 'Type de contenu non pris en charge',
};

interface ReponseErreur {
  statut: number;
  corps: { error: string; details?: { field: string; message: string }[] };
}

export const repondreRouteIntrouvable: RequestHandler = (_requete, reponse) => {
  reponse.status(404).json({ error: 'Ressource introuvable' });
};

/**
 * Dernier filet de sécurité de la chaîne Express : traduit chaque erreur en réponse HTTP.
 *
 * Une erreur prévue (métier, validation, téléversement, erreur client signalée par Express)
 * reçoit son statut et un message destiné à l'utilisateur. Toute autre erreur reçoit 500 et
 * un message générique : renvoyer la pile d'appels ou le message technique révélerait la
 * structure interne (tables, chemins, versions) à un attaquant (OWASP A05). Le détail part
 * uniquement dans le journal serveur.
 */
export const repondreErreurInattendue: ErrorRequestHandler = (
  erreur,
  _requete,
  reponse,
  _suite,
) => {
  const reponseErreur = traduireErreurPrevue(erreur);
  if (reponseErreur !== undefined) {
    reponse.status(reponseErreur.statut).json(reponseErreur.corps);
    return;
  }

  journalApplicatif.error({ err: erreur }, 'Erreur non gérée');
  reponse.status(500).json({ error: 'Erreur interne du serveur' });
};

function traduireErreurPrevue(erreur: unknown): ReponseErreur | undefined {
  if (erreur instanceof ErreurApplicative) {
    return { statut: erreur.statutHttp, corps: { error: erreur.message } };
  }
  if (erreur instanceof ZodError) {
    return traduireDonneesInvalides(erreur);
  }
  if (erreur instanceof MulterError) {
    return traduireErreurTeleversement(erreur);
  }
  const statutErreurClient = extraireStatutErreurClient(erreur);
  if (statutErreurClient === undefined) {
    return undefined;
  }
  const message = MESSAGES_ERREURS_CLIENT[statutErreurClient] ?? 'Requête invalide';
  return { statut: statutErreurClient, corps: { error: message } };
}

function traduireDonneesInvalides(erreur: ZodError): ReponseErreur {
  const details = erreur.issues.map((probleme) => ({
    field: probleme.path.map(String).join('.'),
    message: probleme.message,
  }));
  return { statut: 400, corps: { error: 'Données invalides', details } };
}

function traduireErreurTeleversement(erreur: MulterError): ReponseErreur {
  if (erreur.code === 'LIMIT_FILE_SIZE') {
    return { statut: 413, corps: { error: 'Fichier trop volumineux (10 Mo maximum)' } };
  }
  return { statut: 400, corps: { error: 'Envoi de fichier invalide : un seul champ « file »' } };
}

function extraireStatutErreurClient(erreur: unknown): number | undefined {
  if (typeof erreur !== 'object' || erreur === null || !('status' in erreur)) {
    return undefined;
  }
  const { status } = erreur;
  const estErreurClient = typeof status === 'number' && status >= 400 && status < 500;
  return estErreurClient ? status : undefined;
}

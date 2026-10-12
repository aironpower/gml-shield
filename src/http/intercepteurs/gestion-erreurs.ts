import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { ErreurApplicative } from '../../domaine/erreurs.js';
import { journalApplicatif } from '../../infrastructure/journal-applicatif.js';

const MESSAGES_ERREURS_CLIENT: Readonly<Record<number, string>> = {
  400: 'Requête mal formée',
  413: 'Corps de requête trop volumineux',
  415: 'Type de contenu non pris en charge',
};

export const repondreRouteIntrouvable: RequestHandler = (_requete, reponse) => {
  reponse.status(404).json({ error: 'Ressource introuvable' });
};

/**
 * Dernier filet de sécurité de la chaîne Express : traduit chaque erreur en réponse HTTP.
 *
 * - Erreur métier prévue (ErreurApplicative) : son statut et son message, conçus pour l'utilisateur.
 * - Données invalides (ZodError) : 400 avec le champ fautif, pour que le client puisse corriger.
 * - Erreur client signalée par Express (corps trop volumineux, JSON mal formé) : son statut 4xx.
 * - Toute autre erreur : 500 avec un message générique. Renvoyer la pile d'appels ou le message
 *   technique révélerait la structure interne (tables, chemins, versions) à un attaquant
 *   (OWASP A05 - Security Misconfiguration). Le détail part uniquement dans le journal serveur.
 */
export const repondreErreurInattendue: ErrorRequestHandler = (
  erreur,
  _requete,
  reponse,
  _suite,
) => {
  if (erreur instanceof ErreurApplicative) {
    reponse.status(erreur.statutHttp).json({ error: erreur.message });
    return;
  }
  if (erreur instanceof ZodError) {
    repondreDonneesInvalides(reponse, erreur);
    return;
  }
  const statutErreurClient = extraireStatutErreurClient(erreur);
  if (statutErreurClient !== undefined) {
    const message = MESSAGES_ERREURS_CLIENT[statutErreurClient] ?? 'Requête invalide';
    reponse.status(statutErreurClient).json({ error: message });
    return;
  }

  journalApplicatif.error({ err: erreur }, 'Erreur non gérée');
  reponse.status(500).json({ error: 'Erreur interne du serveur' });
};

function repondreDonneesInvalides(reponse: Response, erreur: ZodError): void {
  const details = erreur.issues.map((probleme) => ({
    field: probleme.path.map(String).join('.'),
    message: probleme.message,
  }));
  reponse.status(400).json({ error: 'Données invalides', details });
}

function extraireStatutErreurClient(erreur: unknown): number | undefined {
  if (typeof erreur !== 'object' || erreur === null || !('status' in erreur)) {
    return undefined;
  }
  const { status } = erreur;
  const estErreurClient = typeof status === 'number' && status >= 400 && status < 500;
  return estErreurClient ? status : undefined;
}

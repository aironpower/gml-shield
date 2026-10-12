import type { ErrorRequestHandler, RequestHandler } from 'express';
import { journalApplicatif } from '../../infrastructure/journal-applicatif.js';

const MESSAGES_ERREURS_CLIENT: Readonly<Record<number, string>> = {
  400: 'Requête mal formée',
  413: 'Corps de requête trop volumineux',
  415: 'Type de contenu non pris en charge',
};

export const repondreRouteIntrouvable: RequestHandler = (_requete, reponse) => {
  reponse.status(404).json({ erreur: 'Ressource introuvable' });
};

/**
 * Dernier filet de sécurité de la chaîne Express.
 *
 * Pourquoi distinguer les erreurs client : l'analyseur JSON d'Express signale un corps
 * trop volumineux ou mal formé par une erreur portant un statut 4xx ; la transformer en 500
 * masquerait une faute du client et fausserait la supervision.
 *
 * Pourquoi un message générique : renvoyer la pile d'appels ou le message technique
 * révélerait la structure interne (tables, chemins, versions) à un attaquant
 * (OWASP A05 - Security Misconfiguration). Le détail part uniquement dans le journal serveur.
 */
export const repondreErreurInattendue: ErrorRequestHandler = (
  erreur,
  _requete,
  reponse,
  _suite,
) => {
  const statutErreurClient = extraireStatutErreurClient(erreur);

  if (statutErreurClient !== undefined) {
    const message = MESSAGES_ERREURS_CLIENT[statutErreurClient] ?? 'Requête invalide';
    reponse.status(statutErreurClient).json({ erreur: message });
    return;
  }

  journalApplicatif.error({ err: erreur }, 'Erreur non gérée');
  reponse.status(500).json({ erreur: 'Erreur interne du serveur' });
};

function extraireStatutErreurClient(erreur: unknown): number | undefined {
  if (typeof erreur !== 'object' || erreur === null || !('status' in erreur)) {
    return undefined;
  }
  const { status } = erreur;
  const estErreurClient = typeof status === 'number' && status >= 400 && status < 500;
  return estErreurClient ? status : undefined;
}

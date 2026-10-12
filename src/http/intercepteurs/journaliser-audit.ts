import type { Request, RequestHandler } from 'express';
import { enregistrerTraceAudit } from '../../depots/depot-journal-audit.js';
import { journalApplicatif } from '../../infrastructure/journal-applicatif.js';

const METHODES_MODIFIANT_DES_DONNEES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LONGUEUR_MAXIMALE_ACTION = 200;

/**
 * Inscrit au journal d'audit chaque requête modifiant des données (Annexe 5 §4), sans
 * intervention des développeurs dans les routes.
 *
 * Pourquoi à la fin de la réponse (« finish ») : le statut HTTP final est alors connu, ce qui
 * distingue une action réussie d'une tentative refusée (connexion échouée, accès interdit),
 * et l'identité de l'utilisateur a été établie par l'intercepteur de session.
 * Pourquoi asynchrone : l'écriture en base ne retarde pas la réponse au client.
 * Limite assumée : si l'écriture échoue, l'erreur est journalisée mais la requête a déjà
 * abouti (« fail-open ») ; une file d'attente durable sera étudiée pour NIS2.
 */
export const journaliserAudit: RequestHandler = (requete, reponse, suite) => {
  if (METHODES_MODIFIANT_DES_DONNEES.has(requete.method)) {
    reponse.on('finish', () => {
      void tracerSansBloquer(requete, reponse.statusCode);
    });
  }
  suite();
};

async function tracerSansBloquer(requete: Request, statutHttp: number): Promise<void> {
  try {
    await enregistrerTraceAudit({
      idUtilisateur: requete.sessionUtilisateur?.utilisateur.id,
      action: decrireAction(requete),
      adresseIp: requete.ip,
      statutHttp,
    });
  } catch (erreur) {
    journalApplicatif.error({ err: erreur }, 'Échec d’écriture de la trace d’audit');
  }
}

/** Méthode et chemin, sans la chaîne de requête qui pourrait contenir des données sensibles. */
function decrireAction(requete: Request): string {
  const cheminSansParametres = requete.originalUrl.replace(/\?.*$/, '');
  return `${requete.method} ${cheminSansParametres}`.slice(0, LONGUEUR_MAXIMALE_ACTION);
}

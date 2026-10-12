import { Router } from 'express';
import { listerDernieresTraces } from '../../depots/depot-journal-audit.js';
import { autoriserRoles } from '../intercepteurs/autoriser-roles.js';
import { exigerSession } from '../intercepteurs/exiger-session.js';

const NOMBRE_TRACES_AFFICHEES = 100;

/**
 * Consultation du journal par l'Admin Sécurité (Annexe 4), en lecture seule : aucune route
 * ne permet de modifier ou de supprimer une trace, et la base le refuserait de toute façon.
 */
export function creerRoutesJournalAudit(): Router {
  const routeur = Router();

  routeur.get('/', exigerSession, autoriserRoles('ADMIN'), async (_requete, reponse) => {
    const traces = await listerDernieresTraces(NOMBRE_TRACES_AFFICHEES);
    reponse.json(traces.map((trace) => ({ ...trace, timestamp: trace.timestamp.toISOString() })));
  });

  return routeur;
}

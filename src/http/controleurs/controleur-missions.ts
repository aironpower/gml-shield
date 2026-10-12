import type { Request, Response } from 'express';
import { z } from 'zod';
import { STATUTS_MISSION } from '../../domaine/mission.js';
import type { DocumentPreuve } from '../../depots/depot-documents.js';
import {
  creerMission,
  faireAvancerMission,
  listerMissionsVisibles,
  type VueMission,
} from '../../services/service-missions.js';
import { obtenirSession } from '../intercepteurs/exiger-session.js';

/** Noms de champs imposés par le contrat d'interface de l'Annexe 5. */
const schemaCreationMission = z.object({
  title: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(500),
  secret_code: z.string().trim().min(4).max(64),
  driver_id: z.uuid(),
});

const schemaChangementStatut = z.object({ status: z.enum(STATUTS_MISSION) });

export const schemaParametresMission = z.object({ idMission: z.uuid() });

export async function creerNouvelleMission(requete: Request, reponse: Response): Promise<void> {
  const corps = schemaCreationMission.parse(requete.body);
  const mission = await creerMission(obtenirSession(requete).utilisateur, {
    titre: corps.title,
    destination: corps.destination,
    codeSecret: corps.secret_code,
    idChauffeur: corps.driver_id,
  });
  reponse.status(201).json(presenterMission(mission));
}

export async function listerMissions(requete: Request, reponse: Response): Promise<void> {
  const missions = await listerMissionsVisibles(obtenirSession(requete).utilisateur);
  reponse.json(missions.map(presenterMission));
}

export async function changerStatut(requete: Request, reponse: Response): Promise<void> {
  const { idMission } = schemaParametresMission.parse(requete.params);
  const { status } = schemaChangementStatut.parse(requete.body);
  const mission = await faireAvancerMission(obtenirSession(requete).utilisateur, idMission, status);
  reponse.json(presenterMission(mission));
}

/** Le code secret n'apparaît dans la réponse que s'il a été déchiffré pour son destinataire. */
function presenterMission(mission: VueMission): object {
  return {
    id: mission.id,
    title: mission.titre,
    destination: mission.destination,
    status: mission.statut,
    driver_id: mission.idChauffeur,
    dispatcher_id: mission.idRepartiteur,
    created_at: mission.creeeLe.toISOString(),
    ...(mission.codeSecret === undefined ? {} : { secret_code: mission.codeSecret }),
    documents: mission.documents.map(presenterDocument),
  };
}

export function presenterDocument(document: DocumentPreuve): object {
  return {
    id: document.id,
    mime_type: document.typeMime,
    size_bytes: document.tailleOctets,
    uploaded_at: document.deposeLe.toISOString(),
  };
}

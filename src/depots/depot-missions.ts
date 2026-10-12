import type { StatutMission } from '../domaine/mission.js';
import { poolConnexions } from '../infrastructure/base-de-donnees/pool-connexions.js';

export interface Mission {
  id: string;
  titre: string;
  destination: string;
  codeSecretChiffre: Buffer;
  statut: StatutMission;
  idChauffeur: string;
  idRepartiteur: string;
  creeeLe: Date;
}

export type NouvelleMission = Omit<Mission, 'statut' | 'creeeLe'>;

interface LigneMission {
  id: string;
  title: string;
  destination: string;
  secret_code: Buffer;
  status: StatutMission;
  driver_id: string;
  dispatcher_id: string;
  created_at: Date;
}

export async function insererMission(mission: NouvelleMission): Promise<Mission> {
  const resultat = await poolConnexions.query<LigneMission>(
    `INSERT INTO missions (id, title, destination, secret_code, driver_id, dispatcher_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, destination, secret_code, status, driver_id, dispatcher_id, created_at`,
    [
      mission.id,
      mission.titre,
      mission.destination,
      mission.codeSecretChiffre,
      mission.idChauffeur,
      mission.idRepartiteur,
    ],
  );
  return versMission(premiereLigne(resultat.rows));
}

export async function listerMissionsDuRepartiteur(idRepartiteur: string): Promise<Mission[]> {
  const resultat = await poolConnexions.query<LigneMission>(
    `SELECT id, title, destination, secret_code, status, driver_id, dispatcher_id, created_at
     FROM missions WHERE dispatcher_id = $1 ORDER BY created_at DESC`,
    [idRepartiteur],
  );
  return resultat.rows.map(versMission);
}

/** RG1 : le filtre sur le chauffeur fait partie de la requête, il ne peut pas être oublié. */
export async function listerMissionsDuChauffeur(idChauffeur: string): Promise<Mission[]> {
  const resultat = await poolConnexions.query<LigneMission>(
    `SELECT id, title, destination, secret_code, status, driver_id, dispatcher_id, created_at
     FROM missions WHERE driver_id = $1 ORDER BY created_at DESC`,
    [idChauffeur],
  );
  return resultat.rows.map(versMission);
}

/** Renvoie undefined si la mission n'existe pas OU n'est pas assignée à ce chauffeur (RG1). */
export async function trouverMissionDuChauffeur(
  idMission: string,
  idChauffeur: string,
): Promise<Mission | undefined> {
  const resultat = await poolConnexions.query<LigneMission>(
    `SELECT id, title, destination, secret_code, status, driver_id, dispatcher_id, created_at
     FROM missions WHERE id = $1 AND driver_id = $2`,
    [idMission, idChauffeur],
  );
  const [ligne] = resultat.rows;
  return ligne === undefined ? undefined : versMission(ligne);
}

/**
 * Change le statut seulement s'il vaut encore `statutAttendu` (verrou optimiste) : si deux
 * requêtes concurrentes tentent la même transition, une seule réussit, l'autre reçoit undefined.
 */
export async function changerStatutMission(
  idMission: string,
  idChauffeur: string,
  statutAttendu: StatutMission,
  nouveauStatut: StatutMission,
): Promise<Mission | undefined> {
  const resultat = await poolConnexions.query<LigneMission>(
    `UPDATE missions SET status = $4
     WHERE id = $1 AND driver_id = $2 AND status = $3
     RETURNING id, title, destination, secret_code, status, driver_id, dispatcher_id, created_at`,
    [idMission, idChauffeur, statutAttendu, nouveauStatut],
  );
  const [ligne] = resultat.rows;
  return ligne === undefined ? undefined : versMission(ligne);
}

function premiereLigne(lignes: LigneMission[]): LigneMission {
  const [ligne] = lignes;
  if (ligne === undefined) {
    throw new Error('Aucune ligne renvoyée par l’insertion');
  }
  return ligne;
}

function versMission(ligne: LigneMission): Mission {
  return {
    id: ligne.id,
    titre: ligne.title,
    destination: ligne.destination,
    codeSecretChiffre: ligne.secret_code,
    statut: ligne.status,
    idChauffeur: ligne.driver_id,
    idRepartiteur: ligne.dispatcher_id,
    creeeLe: ligne.created_at,
  };
}

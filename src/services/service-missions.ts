import { randomUUID } from 'node:crypto';
import {
  ErreurAccesRefuse,
  ErreurConflit,
  ErreurRegleMetier,
  ErreurRessourceIntrouvable,
} from '../domaine/erreurs.js';
import { verifierTransitionStatut, type StatutMission } from '../domaine/mission.js';
import type { UtilisateurAuthentifie } from '../domaine/utilisateur.js';
import {
  compterDocumentsDeLaMission,
  listerDocumentsDesMissions,
  type DocumentPreuve,
} from '../depots/depot-documents.js';
import {
  changerStatutMission,
  insererMission,
  listerMissionsDuChauffeur,
  listerMissionsDuRepartiteur,
  trouverMissionDuChauffeur,
  type Mission,
} from '../depots/depot-missions.js';
import { estChauffeurActif } from '../depots/depot-utilisateurs.js';
import {
  chiffrerSecret,
  dechiffrerSecret,
} from '../infrastructure/securite/chiffrement-secrets.js';
import { envoyerAUtilisateur } from '../temps-reel/hub-notifications.js';

export interface DemandeCreationMission {
  titre: string;
  destination: string;
  codeSecret: string;
  idChauffeur: string;
}

/** Mission telle qu'un utilisateur a le droit de la voir. */
export interface VueMission extends Omit<Mission, 'codeSecretChiffre'> {
  /** Présent uniquement pour le chauffeur assigné : le répartiteur n'en a plus besoin. */
  codeSecret: string | undefined;
  documents: DocumentPreuve[];
}

/**
 * Pourquoi l'identifiant est généré ici et non par la base : il sert de contexte au
 * chiffrement du code secret, qui doit avoir lieu AVANT l'insertion (Annexe 5).
 * La notification temps réel ne transporte pas le code secret : le chauffeur le récupère par
 * l'API, au moment où il en a besoin.
 */
export async function creerMission(
  repartiteur: UtilisateurAuthentifie,
  demande: DemandeCreationMission,
): Promise<VueMission> {
  if (!(await estChauffeurActif(demande.idChauffeur))) {
    throw new ErreurRegleMetier('Le chauffeur désigné est inconnu ou inactif');
  }
  const idMission = randomUUID();
  const mission = await insererMission({
    id: idMission,
    titre: demande.titre,
    destination: demande.destination,
    codeSecretChiffre: chiffrerSecret(demande.codeSecret, idMission),
    idChauffeur: demande.idChauffeur,
    idRepartiteur: repartiteur.id,
  });

  notifierChauffeurAssigne(mission);
  return construireVue(mission, [], false);
}

/**
 * Le répartiteur voit les missions qu'il a créées, sans le code ; le chauffeur voit
 * uniquement les missions qui lui sont assignées (RG1), code déchiffré à la volée.
 */
export async function listerMissionsVisibles(
  utilisateur: UtilisateurAuthentifie,
): Promise<VueMission[]> {
  if (utilisateur.role === 'DISPATCHER') {
    return joindreDocuments(await listerMissionsDuRepartiteur(utilisateur.id), false);
  }
  if (utilisateur.role === 'DRIVER') {
    return joindreDocuments(await listerMissionsDuChauffeur(utilisateur.id), true);
  }
  throw new ErreurAccesRefuse('Accès refusé pour ce rôle');
}

/**
 * RG3 : transition linéaire uniquement. Règle complémentaire : une mission ne peut être
 * clôturée qu'avec au moins une preuve de livraison déposée.
 */
export async function faireAvancerMission(
  chauffeur: UtilisateurAuthentifie,
  idMission: string,
  statutDemande: StatutMission,
): Promise<VueMission> {
  const mission = await trouverMissionDuChauffeur(idMission, chauffeur.id);
  if (mission === undefined) {
    throw new ErreurRessourceIntrouvable('Mission introuvable');
  }
  verifierTransitionStatut(mission.statut, statutDemande);
  if (statutDemande === 'COMPLETED' && (await compterDocumentsDeLaMission(idMission)) === 0) {
    throw new ErreurConflit('Une preuve de livraison est requise pour clôturer la mission');
  }

  const missionModifiee = await changerStatutMission(
    idMission,
    chauffeur.id,
    mission.statut,
    statutDemande,
  );
  if (missionModifiee === undefined) {
    throw new ErreurConflit('La mission a été modifiée entre-temps, rechargez-la');
  }
  return construireVue(missionModifiee, await listerDocumentsDesMissions([idMission]), true);
}

async function joindreDocuments(
  missions: Mission[],
  avecCodeSecret: boolean,
): Promise<VueMission[]> {
  const documents = await listerDocumentsDesMissions(missions.map((mission) => mission.id));
  return missions.map((mission) => construireVue(mission, documents, avecCodeSecret));
}

function construireVue(
  mission: Mission,
  documents: DocumentPreuve[],
  avecCodeSecret: boolean,
): VueMission {
  const { codeSecretChiffre, ...missionSansCode } = mission;
  return {
    ...missionSansCode,
    codeSecret: avecCodeSecret ? dechiffrerSecret(codeSecretChiffre, mission.id) : undefined,
    documents: documents.filter((document) => document.idMission === mission.id),
  };
}

function notifierChauffeurAssigne(mission: Mission): void {
  envoyerAUtilisateur(mission.idChauffeur, {
    type: 'NEW_MISSION',
    mission: {
      id: mission.id,
      title: mission.titre,
      destination: mission.destination,
      created_at: mission.creeeLe.toISOString(),
    },
  });
}

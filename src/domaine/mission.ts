import { ErreurConflit } from './erreurs.js';

export const STATUTS_MISSION = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export type StatutMission = (typeof STATUTS_MISSION)[number];

/**
 * RG3 : chaque statut n'a qu'un seul successeur possible ; COMPLETED est terminal.
 * La même règle est garantie en base par un déclencheur (défense en profondeur).
 */
const STATUT_SUIVANT: Readonly<Record<StatutMission, StatutMission | undefined>> = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: undefined,
};

export function verifierTransitionStatut(
  statutActuel: StatutMission,
  statutDemande: StatutMission,
): void {
  if (STATUT_SUIVANT[statutActuel] !== statutDemande) {
    throw new ErreurConflit(
      `Transition de statut interdite : ${statutActuel} → ${statutDemande} (RG3)`,
    );
  }
}

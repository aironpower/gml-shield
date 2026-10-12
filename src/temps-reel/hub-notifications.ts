import { WebSocket } from 'ws';

export interface EvenementNouvelleMission {
  type: 'NEW_MISSION';
  mission: { id: string; title: string; destination: string; created_at: string };
}

export type EvenementTempsReel = EvenementNouvelleMission;

/**
 * Connexions WebSocket ouvertes, rangées par utilisateur authentifié.
 *
 * Pourquoi indexer par identifiant d'utilisateur : un événement n'est jamais diffusé à tous ;
 * il est remis exclusivement aux connexions de son destinataire (Annexe 5 §3, RG1).
 * Un même chauffeur peut avoir plusieurs onglets ouverts, d'où un ensemble de connexions.
 * Limite assumée : ce registre vit en mémoire d'une seule instance de serveur ; plusieurs
 * instances exigeraient un bus partagé (ex. PostgreSQL LISTEN/NOTIFY ou Redis).
 */
const connexionsParUtilisateur = new Map<string, Set<WebSocket>>();

export function enregistrerConnexion(idUtilisateur: string, connexion: WebSocket): void {
  const connexions = connexionsParUtilisateur.get(idUtilisateur) ?? new Set<WebSocket>();
  connexions.add(connexion);
  connexionsParUtilisateur.set(idUtilisateur, connexions);

  connexion.on('close', () => {
    connexions.delete(connexion);
    if (connexions.size === 0) {
      connexionsParUtilisateur.delete(idUtilisateur);
    }
  });
}

/** Renvoie le nombre de connexions ayant reçu l'événement (0 si l'utilisateur est hors ligne). */
export function envoyerAUtilisateur(idUtilisateur: string, evenement: EvenementTempsReel): number {
  const connexionsOuvertes = [...(connexionsParUtilisateur.get(idUtilisateur) ?? [])].filter(
    (connexion) => connexion.readyState === WebSocket.OPEN,
  );
  const message = JSON.stringify(evenement);
  connexionsOuvertes.forEach((connexion) => {
    connexion.send(message);
  });
  return connexionsOuvertes.length;
}

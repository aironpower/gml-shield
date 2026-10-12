import type { RoleUtilisateur } from '../domaine/utilisateur.js';
import { creerCompteSiAbsent } from '../depots/depot-utilisateurs.js';
import { hacherMotDePasse } from '../infrastructure/securite/hachage-mots-de-passe.js';

export const COMPTES_DEMONSTRATION: readonly { email: string; role: RoleUtilisateur }[] = [
  { email: 'admin@gml-shield.test', role: 'ADMIN' },
  { email: 'repartiteur@gml-shield.test', role: 'DISPATCHER' },
  { email: 'chauffeur.martin@gml-shield.test', role: 'DRIVER' },
  { email: 'chauffeur.durand@gml-shield.test', role: 'DRIVER' },
];

export const LONGUEUR_MINIMALE_MOT_DE_PASSE_DEMO = 12;

/**
 * Crée les comptes utilisés pour la démonstration (un par rôle, deux chauffeurs pour
 * prouver le cloisonnement RG1). Sans effet sur les comptes déjà présents.
 *
 * Pourquoi le mot de passe vient de l'environnement : aucun mot de passe, même de
 * démonstration, ne doit figurer dans le dépôt de code public.
 */
export async function creerComptesDemonstration(motDePasse: string): Promise<number> {
  if (motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE_DEMO) {
    throw new Error(
      `Mot de passe de démonstration trop court (${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_DEMO)} caractères minimum)`,
    );
  }
  let nombreComptesCrees = 0;
  for (const compte of COMPTES_DEMONSTRATION) {
    const empreinteMotDePasse = await hacherMotDePasse(motDePasse);
    if (await creerCompteSiAbsent({ ...compte, empreinteMotDePasse })) {
      nombreComptesCrees += 1;
    }
  }
  return nombreComptesCrees;
}

export const ROLES_UTILISATEUR = ['ADMIN', 'DISPATCHER', 'DRIVER'] as const;

export type RoleUtilisateur = (typeof ROLES_UTILISATEUR)[number];

export interface UtilisateurAuthentifie {
  id: string;
  email: string;
  role: RoleUtilisateur;
}

export type RoleUtilisateur = 'ADMIN' | 'DISPATCHER' | 'DRIVER';

export interface UtilisateurAuthentifie {
  id: string;
  email: string;
  role: RoleUtilisateur;
}

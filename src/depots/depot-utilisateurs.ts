import { poolConnexions } from '../infrastructure/base-de-donnees/pool-connexions.js';
import type { RoleUtilisateur, UtilisateurAuthentifie } from '../domaine/utilisateur.js';

export interface CompteUtilisateur extends UtilisateurAuthentifie {
  empreinteMotDePasse: string;
  estActif: boolean;
}

export interface NouveauCompte {
  email: string;
  empreinteMotDePasse: string;
  role: RoleUtilisateur;
}

interface LigneUtilisateur {
  id: string;
  email: string;
  password_hash: string;
  role: RoleUtilisateur;
  is_active: boolean;
}

export async function trouverCompteParEmail(email: string): Promise<CompteUtilisateur | undefined> {
  const resultat = await poolConnexions.query<LigneUtilisateur>(
    'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email],
  );
  return versCompteUtilisateur(resultat.rows[0]);
}

export async function trouverCompteParId(id: string): Promise<CompteUtilisateur | undefined> {
  const resultat = await poolConnexions.query<LigneUtilisateur>(
    'SELECT id, email, password_hash, role, is_active FROM users WHERE id = $1',
    [id],
  );
  return versCompteUtilisateur(resultat.rows[0]);
}

/** Crée le compte s'il n'existe pas ; renvoie false si l'adresse e-mail est déjà utilisée. */
export async function creerCompteSiAbsent(compte: NouveauCompte): Promise<boolean> {
  const resultat = await poolConnexions.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [compte.email, compte.empreinteMotDePasse, compte.role],
  );
  return resultat.rowCount === 1;
}

function versCompteUtilisateur(ligne: LigneUtilisateur | undefined): CompteUtilisateur | undefined {
  if (ligne === undefined) {
    return undefined;
  }
  return {
    id: ligne.id,
    email: ligne.email,
    role: ligne.role,
    empreinteMotDePasse: ligne.password_hash,
    estActif: ligne.is_active,
  };
}

export interface ChauffeurDisponible {
  id: string;
  email: string;
}

export async function listerChauffeursActifs(): Promise<ChauffeurDisponible[]> {
  const resultat = await poolConnexions.query<ChauffeurDisponible>(
    "SELECT id, email FROM users WHERE role = 'DRIVER' AND is_active ORDER BY email",
  );
  return resultat.rows;
}

/**
 * Pourquoi vérifier le rôle : la clé étrangère garantit seulement que l'utilisateur existe ;
 * sans ce contrôle, une mission pourrait être assignée à un répartiteur ou à un compte désactivé.
 */
export async function estChauffeurActif(idUtilisateur: string): Promise<boolean> {
  const resultat = await poolConnexions.query(
    "SELECT 1 FROM users WHERE id = $1 AND role = 'DRIVER' AND is_active",
    [idUtilisateur],
  );
  return resultat.rowCount === 1;
}

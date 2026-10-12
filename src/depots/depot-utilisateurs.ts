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

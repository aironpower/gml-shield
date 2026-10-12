import { randomUUID } from 'node:crypto';
import { ErreurAuthentification } from '../domaine/erreurs.js';
import type { UtilisateurAuthentifie } from '../domaine/utilisateur.js';
import { estJetonRevoque, revoquerJeton } from '../depots/depot-jetons-revoques.js';
import {
  trouverCompteParEmail,
  trouverCompteParId,
  type CompteUtilisateur,
} from '../depots/depot-utilisateurs.js';
import {
  hacherMotDePasse,
  verifierMotDePasse,
} from '../infrastructure/securite/hachage-mots-de-passe.js';
import {
  emettreJetonSession,
  lireJetonSession,
} from '../infrastructure/securite/jetons-session.js';

const MESSAGE_IDENTIFIANTS_INVALIDES = 'Identifiants invalides';
const MESSAGE_SESSION_INVALIDE = 'Session absente, invalide ou expirée';

export interface SessionUtilisateur {
  utilisateur: UtilisateurAuthentifie;
  idJeton: string;
  expiration: Date;
}

export interface SessionOuverte extends SessionUtilisateur {
  jeton: string;
}

let empreinteLeurre: Promise<string> | undefined;

/**
 * Vérifie les identifiants et ouvre une session.
 *
 * Pourquoi un message unique pour tous les échecs (compte inconnu, désactivé ou mauvais
 * mot de passe) : des messages distincts permettraient de deviner quelles adresses e-mail
 * existent. Pour la même raison, un mot de passe est toujours vérifié, contre une empreinte
 * leurre si le compte n'existe pas, afin que la durée de réponse ne trahisse rien.
 */
export async function ouvrirSession(email: string, motDePasse: string): Promise<SessionOuverte> {
  const compte = await trouverCompteParEmail(email.toLowerCase());
  const empreinteAComparer = compte?.empreinteMotDePasse ?? (await obtenirEmpreinteLeurre());
  const motDePasseCorrect = await verifierMotDePasse(empreinteAComparer, motDePasse);

  if (compte === undefined || !compte.estActif || !motDePasseCorrect) {
    throw new ErreurAuthentification(MESSAGE_IDENTIFIANTS_INVALIDES);
  }

  const { jeton, idJeton, expiration } = await emettreJetonSession(compte.id);
  return { utilisateur: versUtilisateurAuthentifie(compte), jeton, idJeton, expiration };
}

/**
 * Reconnaît l'utilisateur à partir du jeton reçu, à chaque requête protégée.
 * Trois conditions : jeton authentique et non expiré, jeton non révoqué, compte toujours actif.
 */
export async function verifierSession(jeton: string | undefined): Promise<SessionUtilisateur> {
  const contenu = jeton === undefined ? undefined : await lireJetonSession(jeton);
  if (contenu === undefined || (await estJetonRevoque(contenu.idJeton))) {
    throw new ErreurAuthentification(MESSAGE_SESSION_INVALIDE);
  }

  const compte = await trouverCompteParId(contenu.idUtilisateur);
  if (!compte?.estActif) {
    throw new ErreurAuthentification(MESSAGE_SESSION_INVALIDE);
  }

  return {
    utilisateur: versUtilisateurAuthentifie(compte),
    idJeton: contenu.idJeton,
    expiration: contenu.expiration,
  };
}

export async function fermerSession(session: SessionUtilisateur): Promise<void> {
  await revoquerJeton(session.idJeton, session.expiration);
}

function obtenirEmpreinteLeurre(): Promise<string> {
  empreinteLeurre ??= hacherMotDePasse(randomUUID());
  return empreinteLeurre;
}

function versUtilisateurAuthentifie(compte: CompteUtilisateur): UtilisateurAuthentifie {
  return { id: compte.id, email: compte.email, role: compte.role };
}

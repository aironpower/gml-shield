import { randomUUID } from 'node:crypto';
import { errors, jwtVerify, SignJWT } from 'jose';
import { environnement } from '../../configuration/environnement.js';

const ALGORITHME_SIGNATURE = 'HS256';
const EMETTEUR = 'gml-shield';
const AUDIENCE = 'gml-shield-api';
const SECONDES_PAR_MINUTE = 60;

const cleSignature = new TextEncoder().encode(environnement.SECRET_JWT);

export interface JetonSessionEmis {
  jeton: string;
  idJeton: string;
  expiration: Date;
}

export interface ContenuJetonSession {
  idUtilisateur: string;
  idJeton: string;
  expiration: Date;
}

/**
 * Émet un jeton JWT signé, de courte durée, identifiant l'utilisateur.
 *
 * Pourquoi une durée courte (15 min par défaut) : un jeton volé n'est exploitable que
 * brièvement. Pourquoi un identifiant unique (jti) : il permet de révoquer ce jeton précis
 * à la déconnexion, sans attendre son expiration (Annexe 5).
 * Le jeton ne contient ni rôle ni e-mail : ces données sont relues en base à chaque requête,
 * pour qu'un compte désactivé ou un rôle modifié prenne effet immédiatement.
 */
export async function emettreJetonSession(idUtilisateur: string): Promise<JetonSessionEmis> {
  const idJeton = randomUUID();
  const dureeSecondes = environnement.DUREE_SESSION_MINUTES * SECONDES_PAR_MINUTE;
  const expirationSecondes = Math.floor(Date.now() / 1000) + dureeSecondes;

  const jeton = await new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHME_SIGNATURE })
    .setSubject(idUtilisateur)
    .setJti(idJeton)
    .setIssuer(EMETTEUR)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expirationSecondes)
    .sign(cleSignature);

  return { jeton, idJeton, expiration: new Date(expirationSecondes * 1000) };
}

/**
 * Vérifie la signature, l'émetteur, l'audience et l'expiration d'un jeton.
 * Renvoie undefined pour tout jeton invalide, sans distinguer la cause, afin de ne donner
 * aucune indication à un attaquant.
 *
 * Pourquoi imposer la liste `algorithms` : sans elle, un jeton forgé déclarant « alg: none »
 * ou un autre algorithme pourrait être accepté (attaque par confusion d'algorithme).
 */
export async function lireJetonSession(jeton: string): Promise<ContenuJetonSession | undefined> {
  try {
    const { payload } = await jwtVerify(jeton, cleSignature, {
      algorithms: [ALGORITHME_SIGNATURE],
      issuer: EMETTEUR,
      audience: AUDIENCE,
    });
    if (payload.sub === undefined || payload.jti === undefined || payload.exp === undefined) {
      return undefined;
    }
    return {
      idUtilisateur: payload.sub,
      idJeton: payload.jti,
      expiration: new Date(payload.exp * 1000),
    };
  } catch (erreur) {
    if (erreur instanceof errors.JOSEError) {
      return undefined;
    }
    throw erreur;
  }
}

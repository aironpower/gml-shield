import { hash, verify } from '@node-rs/argon2';

/**
 * Paramètres minimaux recommandés par l'OWASP pour Argon2id (19 Mio, 2 passes, 1 fil).
 *
 * Pourquoi Argon2id : l'algorithme est volontairement coûteux en mémoire, ce qui rend
 * le cassage massif d'empreintes volées sur carte graphique très lent, contrairement à
 * SHA-256. La bibliothèque utilise Argon2id par défaut ; la base refuse d'ailleurs toute
 * empreinte ne commençant pas par « $argon2id$ ».
 * https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
const PARAMETRES_ARGON2ID = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return hash(motDePasse, PARAMETRES_ARGON2ID);
}

export function verifierMotDePasse(empreinte: string, motDePasse: string): Promise<boolean> {
  return verify(empreinte, motDePasse);
}

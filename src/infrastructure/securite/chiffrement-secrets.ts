import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { environnement } from '../../configuration/environnement.js';

const ALGORITHME = 'aes-256-gcm';
const VERSION_FORMAT = 1;
const TAILLE_VECTEUR_INITIALISATION = 12;
const TAILLE_ETIQUETTE_AUTHENTIFICATION = 16;
const DEBUT_VECTEUR = 1;
const DEBUT_ETIQUETTE = DEBUT_VECTEUR + TAILLE_VECTEUR_INITIALISATION;
const DEBUT_TEXTE_CHIFFRE = DEBUT_ETIQUETTE + TAILLE_ETIQUETTE_AUTHENTIFICATION;

const cleChiffrement = Buffer.from(environnement.CLE_CHIFFREMENT_SECRETS, 'base64');

/**
 * Chiffre un code d'accès d'entrepôt avant son écriture en base (RG2, Annexe 5).
 *
 * Pourquoi AES-256-GCM : le mode GCM chiffre ET authentifie ; toute modification des octets
 * stockés (par un administrateur de base malveillant, par exemple) est détectée au
 * déchiffrement au lieu de produire silencieusement un code erroné.
 * Pourquoi un vecteur d'initialisation aléatoire par chiffrement : deux missions ayant le même
 * code produisent des octets différents, ce qui empêche de repérer les codes identiques.
 * Pourquoi le contexte (identifiant de mission) en donnée associée : un code chiffré copié
 * d'une mission vers une autre devient indéchiffrable.
 * Pourquoi un octet de version en tête : il permettra de changer de clé ou d'algorithme
 * sans rendre illisibles les codes déjà stockés.
 *
 * Format stocké : version (1 octet) | vecteur (12) | étiquette (16) | texte chiffré.
 * La clé n'est jamais en base : elle vient de la variable d'environnement CLE_CHIFFREMENT_SECRETS.
 */
export function chiffrerSecret(texteClair: string, contexte: string): Buffer {
  const vecteurInitialisation = randomBytes(TAILLE_VECTEUR_INITIALISATION);
  const chiffreur = createCipheriv(ALGORITHME, cleChiffrement, vecteurInitialisation);
  chiffreur.setAAD(Buffer.from(contexte, 'utf8'));
  const texteChiffre = Buffer.concat([chiffreur.update(texteClair, 'utf8'), chiffreur.final()]);

  return Buffer.concat([
    Buffer.from([VERSION_FORMAT]),
    vecteurInitialisation,
    chiffreur.getAuthTag(),
    texteChiffre,
  ]);
}

/** Lève une erreur si les octets ont été altérés ou rattachés à un autre contexte. */
export function dechiffrerSecret(donneesChiffrees: Buffer, contexte: string): string {
  if (donneesChiffrees[0] !== VERSION_FORMAT) {
    throw new Error('Format de secret chiffré inconnu');
  }
  const dechiffreur = createDecipheriv(
    ALGORITHME,
    cleChiffrement,
    donneesChiffrees.subarray(DEBUT_VECTEUR, DEBUT_ETIQUETTE),
  );
  dechiffreur.setAAD(Buffer.from(contexte, 'utf8'));
  dechiffreur.setAuthTag(donneesChiffrees.subarray(DEBUT_ETIQUETTE, DEBUT_TEXTE_CHIFFRE));

  return Buffer.concat([
    dechiffreur.update(donneesChiffrees.subarray(DEBUT_TEXTE_CHIFFRE)),
    dechiffreur.final(),
  ]).toString('utf8');
}

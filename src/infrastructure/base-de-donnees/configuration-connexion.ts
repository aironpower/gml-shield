import { readFileSync } from 'node:fs';
import type pg from 'pg';
import { environnement } from '../../configuration/environnement.js';

/**
 * Paramètres de connexion à PostgreSQL, partagés par le serveur et les migrations.
 *
 * Pourquoi vérifier le certificat avec l'autorité de Supabase : chiffrer sans vérifier
 * l'identité du serveur laisserait un attaquant placé sur le réseau se faire passer pour la
 * base et lire les requêtes (attaque de l'homme du milieu). Le certificat racine versionné
 * dans `certificats/` est public : ce n'est pas un secret.
 * Sans CHEMIN_CERTIFICAT_CA_BASE (base locale du docker-compose), la connexion reste en clair
 * sur la boucle locale 127.0.0.1.
 */
export function configurationConnexionBaseDonnees(): pg.ClientConfig {
  const cheminCertificat = environnement.CHEMIN_CERTIFICAT_CA_BASE;
  return {
    connectionString: environnement.DATABASE_URL,
    ...(cheminCertificat === undefined
      ? {}
      : { ssl: { ca: readFileSync(cheminCertificat, 'utf8'), rejectUnauthorized: true } }),
  };
}

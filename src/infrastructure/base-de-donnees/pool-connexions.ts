import pg from 'pg';
import { configurationConnexionBaseDonnees } from './configuration-connexion.js';

const NOMBRE_MAXIMAL_CONNEXIONS = 10;

/**
 * Pool unique de connexions PostgreSQL partagé par tous les dépôts.
 *
 * Pourquoi un pool : ouvrir une connexion TCP + TLS par requête HTTP coûte plusieurs
 * dizaines de millisecondes ; le pool les réutilise et plafonne leur nombre pour ne pas
 * saturer l'offre gratuite de l'hébergeur de base de données.
 *
 * Règle SEC-01 : toute requête passe par `query(texte, valeurs)` avec des paramètres
 * `$1, $2…`, jamais par concaténation ; le pilote envoie alors les valeurs séparément
 * du texte SQL, ce qui rend l'injection impossible.
 */
export const poolConnexions = new pg.Pool({
  ...configurationConnexionBaseDonnees(),
  max: NOMBRE_MAXIMAL_CONNEXIONS,
});

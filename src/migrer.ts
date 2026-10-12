import { configurationConnexionBaseDonnees } from './infrastructure/base-de-donnees/configuration-connexion.js';
import { appliquerMigrations } from './infrastructure/base-de-donnees/migrations.js';

await appliquerMigrations(configurationConnexionBaseDonnees());

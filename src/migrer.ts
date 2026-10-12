import { environnement } from './configuration/environnement.js';
import { appliquerMigrations } from './infrastructure/base-de-donnees/migrations.js';

await appliquerMigrations(environnement.DATABASE_URL);

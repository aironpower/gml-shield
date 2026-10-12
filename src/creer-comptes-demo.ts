import { journalApplicatif } from './infrastructure/journal-applicatif.js';
import { poolConnexions } from './infrastructure/base-de-donnees/pool-connexions.js';
import { creerComptesDemonstration } from './services/service-comptes-demonstration.js';

const nombreComptesCrees = await creerComptesDemonstration(
  process.env.MOT_DE_PASSE_COMPTES_DEMO ?? '',
);
journalApplicatif.info({ nombreComptesCrees }, 'Comptes de démonstration prêts');
await poolConnexions.end();

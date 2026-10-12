import { journalApplicatif } from './infrastructure/journal-applicatif.js';
import { creerStockageSupabase } from './infrastructure/stockage/stockage-preuves.js';

await creerStockageSupabase().preparerCompartiment();
journalApplicatif.info('Compartiment privé des preuves de livraison prêt');

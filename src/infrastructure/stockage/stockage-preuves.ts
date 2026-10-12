import { environnement } from '../../configuration/environnement.js';
import { StockageDisqueLocal } from './stockage-disque-local.js';
import type { StockageFichiers } from './stockage-fichiers.js';
import { StockageSupabase } from './stockage-supabase.js';

export function creerStockageSupabase(): StockageSupabase {
  const urlProjet = environnement.SUPABASE_URL;
  const cleSecrete = environnement.SUPABASE_CLE_SECRETE;
  if (urlProjet === undefined || cleSecrete === undefined) {
    throw new Error('SUPABASE_URL et SUPABASE_CLE_SECRETE sont requis');
  }
  return new StockageSupabase(urlProjet, cleSecrete, environnement.COMPARTIMENT_PREUVES);
}

function creerStockageDepuisEnvironnement(): StockageFichiers {
  return environnement.STOCKAGE_PREUVES === 'supabase'
    ? creerStockageSupabase()
    : new StockageDisqueLocal(environnement.DOSSIER_PREUVES);
}

export const stockagePreuves: StockageFichiers = creerStockageDepuisEnvironnement();

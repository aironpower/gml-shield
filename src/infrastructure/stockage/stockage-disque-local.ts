import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { StockageFichiers } from './stockage-fichiers.js';

/**
 * Stockage dans un dossier local, hors de toute arborescence servie par HTTP : un fichier
 * déposé n'est jamais accessible par une URL directe, seulement via l'API après contrôle
 * des droits (Annexe 5).
 */
export class StockageDisqueLocal implements StockageFichiers {
  private readonly dossierRacine: string;

  constructor(dossierRacine: string) {
    this.dossierRacine = resolve(dossierRacine);
  }

  async deposer(cle: string, contenu: Buffer): Promise<void> {
    const chemin = this.resoudreDansLaRacine(cle);
    await mkdir(dirname(chemin), { recursive: true });
    // « wx » : échoue si le fichier existe déjà, une preuve n'est jamais écrasée.
    await writeFile(chemin, contenu, { flag: 'wx' });
  }

  async recuperer(cle: string): Promise<Buffer> {
    return readFile(this.resoudreDansLaRacine(cle));
  }

  /**
   * Pourquoi ce contrôle alors que les clés sont générées par le serveur : défense en
   * profondeur contre la traversée de répertoire (« ../ ») si une clé venait un jour
   * d'une source moins sûre.
   */
  private resoudreDansLaRacine(cle: string): string {
    const chemin = resolve(this.dossierRacine, cle);
    if (!chemin.startsWith(this.dossierRacine + sep)) {
      throw new Error('Clé de stockage hors du dossier autorisé');
    }
    return chemin;
  }
}

import type { StockageFichiers } from './stockage-fichiers.js';

const TAILLE_MAXIMALE_PREUVE_OCTETS = 10 * 1024 * 1024;
const TYPES_MIME_ACCEPTES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * Stockage dans un compartiment privé Supabase Storage, appelé en HTTPS avec la clé secrète.
 *
 * Pourquoi un compartiment privé : aucun fichier n'a d'URL publique ; seul le serveur, qui
 * détient la clé secrète, peut lire un fichier, après avoir vérifié les droits de l'utilisateur.
 * La clé secrète ne quitte jamais le serveur (jamais envoyée au navigateur).
 */
export class StockageSupabase implements StockageFichiers {
  constructor(
    private readonly urlProjet: string,
    private readonly cleSecrete: string,
    private readonly compartiment: string,
  ) {}

  async deposer(cle: string, contenu: Buffer, typeMime: string): Promise<void> {
    const reponse = await fetch(this.urlObjet(cle), {
      method: 'POST',
      headers: { ...this.enTetesAuthentification(), 'Content-Type': typeMime, 'x-upsert': 'false' },
      body: contenu,
    });
    if (!reponse.ok) {
      throw new Error(`Dépôt refusé par le stockage (HTTP ${String(reponse.status)})`);
    }
  }

  async recuperer(cle: string): Promise<Buffer> {
    const reponse = await fetch(this.urlObjet(cle), { headers: this.enTetesAuthentification() });
    if (!reponse.ok) {
      throw new Error(`Lecture refusée par le stockage (HTTP ${String(reponse.status)})`);
    }
    return Buffer.from(await reponse.arrayBuffer());
  }

  /**
   * Crée le compartiment, ou réaligne sa configuration s'il existe déjà.
   *
   * Pourquoi par le code et non à la main dans la console : la configuration de sécurité
   * (privé, 10 Mo, types autorisés) est relue en revue et reproductible. Le compartiment
   * applique ces limites lui-même, en plus des contrôles de l'API (défense en profondeur).
   */
  async preparerCompartiment(): Promise<void> {
    const configuration = {
      public: false,
      file_size_limit: TAILLE_MAXIMALE_PREUVE_OCTETS,
      allowed_mime_types: TYPES_MIME_ACCEPTES,
    };
    const creation = await this.appelerApiCompartiments('POST', '/bucket', {
      id: this.compartiment,
      name: this.compartiment,
      ...configuration,
    });
    if (creation.ok) {
      return;
    }
    const miseAJour = await this.appelerApiCompartiments(
      'PUT',
      `/bucket/${this.compartiment}`,
      configuration,
    );
    if (!miseAJour.ok) {
      throw new Error(`Préparation du compartiment impossible (HTTP ${String(miseAJour.status)})`);
    }
  }

  private appelerApiCompartiments(
    methode: string,
    chemin: string,
    corps: object,
  ): Promise<Response> {
    return fetch(`${this.urlProjet}/storage/v1${chemin}`, {
      method: methode,
      headers: { ...this.enTetesAuthentification(), 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
  }

  private urlObjet(cle: string): string {
    return `${this.urlProjet}/storage/v1/object/${this.compartiment}/${cle}`;
  }

  private enTetesAuthentification(): Record<string, string> {
    // Noms d'en-têtes en minuscules : HTTP ne distingue pas la casse.
    return { apikey: this.cleSecrete, authorization: `Bearer ${this.cleSecrete}` };
  }
}

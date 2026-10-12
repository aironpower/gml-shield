/**
 * Port de stockage des preuves de livraison.
 *
 * Pourquoi une interface : le service métier ne sait pas où vivent les fichiers. En local et
 * en test, un dossier hors de l'arborescence publique suffit ; en production, l'hébergeur
 * n'offre qu'un disque éphémère, d'où un compartiment privé Supabase. Changer de fournisseur
 * (S3, Azure Blob…) ne demandera qu'une nouvelle implémentation de ce port.
 */
export interface StockageFichiers {
  deposer(cle: string, contenu: Buffer, typeMime: string): Promise<void>;
  recuperer(cle: string): Promise<Buffer>;
}

import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import {
  ErreurConflit,
  ErreurRessourceIntrouvable,
  ErreurTypeFichierRefuse,
} from '../domaine/erreurs.js';
import type { UtilisateurAuthentifie } from '../domaine/utilisateur.js';
import {
  insererDocument,
  trouverDocumentDuRepartiteur,
  type DocumentPreuve,
} from '../depots/depot-documents.js';
import { trouverMissionDuChauffeur } from '../depots/depot-missions.js';
import { stockagePreuves } from '../infrastructure/stockage/stockage-preuves.js';

const EXTENSION_PAR_TYPE_MIME: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['application/pdf', 'pdf'],
]);

export interface FichierPreuve {
  contenu: Buffer;
  typeMime: string;
  nomFichier: string;
}

/**
 * Enregistre la preuve de livraison d'une mission (RG4 : chauffeur assigné uniquement).
 *
 * Pourquoi détecter le type à partir du contenu : le nom du fichier et le type MIME déclarés
 * par le client sont choisis par lui et donc falsifiables ; un script renommé « photo.png »
 * serait accepté. Les premiers octets (signature « magique ») révèlent le format réel.
 * Pourquoi une clé de stockage générée : le nom fourni par le client n'est jamais utilisé,
 * ce qui exclut toute traversée de répertoire ou collision volontaire.
 */
export async function deposerPreuveLivraison(
  chauffeur: UtilisateurAuthentifie,
  idMission: string,
  contenu: Buffer,
): Promise<DocumentPreuve> {
  const mission = await trouverMissionDuChauffeur(idMission, chauffeur.id);
  if (mission === undefined) {
    throw new ErreurRessourceIntrouvable('Mission introuvable');
  }
  if (mission.statut !== 'IN_PROGRESS') {
    throw new ErreurConflit('La preuve se dépose pendant la livraison (statut IN_PROGRESS)');
  }

  const typeMimeReel = (await fileTypeFromBuffer(contenu))?.mime;
  const extension =
    typeMimeReel === undefined ? undefined : EXTENSION_PAR_TYPE_MIME.get(typeMimeReel);
  if (typeMimeReel === undefined || extension === undefined) {
    throw new ErreurTypeFichierRefuse('Seuls les fichiers JPEG, PNG et PDF sont acceptés');
  }

  const cleStockage = `missions/${idMission}/${randomUUID()}.${extension}`;
  await stockagePreuves.deposer(cleStockage, contenu, typeMimeReel);
  return insererDocument({
    idMission,
    cleStockage,
    typeMime: typeMimeReel,
    tailleOctets: contenu.length,
    deposePar: chauffeur.id,
  });
}

/** Seul le répartiteur auteur de la mission peut télécharger ses preuves (Annexe 5). */
export async function recupererPreuveLivraison(
  repartiteur: UtilisateurAuthentifie,
  idMission: string,
  idDocument: string,
): Promise<FichierPreuve> {
  const document = await trouverDocumentDuRepartiteur(idDocument, idMission, repartiteur.id);
  if (document === undefined) {
    throw new ErreurRessourceIntrouvable('Document introuvable');
  }
  const extension = EXTENSION_PAR_TYPE_MIME.get(document.typeMime) ?? 'bin';
  return {
    contenu: await stockagePreuves.recuperer(document.cleStockage),
    typeMime: document.typeMime,
    nomFichier: `preuve-${document.id}.${extension}`,
  };
}

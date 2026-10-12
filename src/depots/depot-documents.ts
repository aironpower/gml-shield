import { poolConnexions } from '../infrastructure/base-de-donnees/pool-connexions.js';

export interface DocumentPreuve {
  id: string;
  idMission: string;
  cleStockage: string;
  typeMime: string;
  tailleOctets: number;
  deposePar: string;
  deposeLe: Date;
}

export type NouveauDocumentPreuve = Omit<DocumentPreuve, 'id' | 'deposeLe'>;

interface LigneDocument {
  id: string;
  mission_id: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: Date;
}

export async function insererDocument(document: NouveauDocumentPreuve): Promise<DocumentPreuve> {
  const resultat = await poolConnexions.query<LigneDocument>(
    `INSERT INTO documents (mission_id, file_path, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, mission_id, file_path, mime_type, size_bytes, uploaded_by, uploaded_at`,
    [
      document.idMission,
      document.cleStockage,
      document.typeMime,
      document.tailleOctets,
      document.deposePar,
    ],
  );
  const [ligne] = resultat.rows;
  if (ligne === undefined) {
    throw new Error('Aucune ligne renvoyée par l’insertion');
  }
  return versDocument(ligne);
}

export async function listerDocumentsDesMissions(idsMissions: string[]): Promise<DocumentPreuve[]> {
  const resultat = await poolConnexions.query<LigneDocument>(
    `SELECT id, mission_id, file_path, mime_type, size_bytes, uploaded_by, uploaded_at
     FROM documents WHERE mission_id = ANY($1::uuid[]) ORDER BY uploaded_at`,
    [idsMissions],
  );
  return resultat.rows.map(versDocument);
}

export async function compterDocumentsDeLaMission(idMission: string): Promise<number> {
  const resultat = await poolConnexions.query<{ nombre: number }>(
    'SELECT count(*)::int AS nombre FROM documents WHERE mission_id = $1',
    [idMission],
  );
  return resultat.rows[0]?.nombre ?? 0;
}

/**
 * Le document doit appartenir à la mission indiquée ET la mission au répartiteur : impossible
 * de télécharger la preuve d'une autre mission en changeant un identifiant dans l'URL.
 */
export async function trouverDocumentDuRepartiteur(
  idDocument: string,
  idMission: string,
  idRepartiteur: string,
): Promise<DocumentPreuve | undefined> {
  const resultat = await poolConnexions.query<LigneDocument>(
    `SELECT d.id, d.mission_id, d.file_path, d.mime_type, d.size_bytes, d.uploaded_by, d.uploaded_at
     FROM documents d JOIN missions m ON m.id = d.mission_id
     WHERE d.id = $1 AND d.mission_id = $2 AND m.dispatcher_id = $3`,
    [idDocument, idMission, idRepartiteur],
  );
  const [ligne] = resultat.rows;
  return ligne === undefined ? undefined : versDocument(ligne);
}

function versDocument(ligne: LigneDocument): DocumentPreuve {
  return {
    id: ligne.id,
    idMission: ligne.mission_id,
    cleStockage: ligne.file_path,
    typeMime: ligne.mime_type,
    tailleOctets: ligne.size_bytes,
    deposePar: ligne.uploaded_by,
    deposeLe: ligne.uploaded_at,
  };
}

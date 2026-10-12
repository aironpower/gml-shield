import type { Request, Response } from 'express';
import { z } from 'zod';
import { ErreurRegleMetier } from '../../domaine/erreurs.js';
import {
  deposerPreuveLivraison,
  recupererPreuveLivraison,
} from '../../services/service-preuves-livraison.js';
import { obtenirSession } from '../intercepteurs/exiger-session.js';
import { presenterDocument, schemaParametresMission } from './controleur-missions.js';

const schemaParametresDocument = schemaParametresMission.extend({ idDocument: z.uuid() });

export async function deposerPreuve(requete: Request, reponse: Response): Promise<void> {
  const { idMission } = schemaParametresMission.parse(requete.params);
  if (requete.file === undefined) {
    throw new ErreurRegleMetier('Un fichier est attendu dans le champ « file »');
  }
  const document = await deposerPreuveLivraison(
    obtenirSession(requete).utilisateur,
    idMission,
    requete.file.buffer,
  );
  reponse.status(201).json(presenterDocument(document));
}

/**
 * Pourquoi « attachment » et « no-store » : le navigateur télécharge le fichier au lieu de
 * l'interpréter dans la page, et aucune copie d'une preuve confidentielle ne reste en cache.
 * L'en-tête nosniff (posé par helmet) empêche le navigateur de deviner un autre type.
 */
export async function telechargerPreuve(requete: Request, reponse: Response): Promise<void> {
  const { idMission, idDocument } = schemaParametresDocument.parse(requete.params);
  const fichier = await recupererPreuveLivraison(
    obtenirSession(requete).utilisateur,
    idMission,
    idDocument,
  );
  reponse
    .status(200)
    .type(fichier.typeMime)
    .attachment(fichier.nomFichier)
    .set('Cache-Control', 'no-store')
    .send(fichier.contenu);
}

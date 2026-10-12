import type { Express } from 'express';
import request from 'supertest';
import { ORIGINE_CLIENT } from './sessions-test.js';

/** Plus petite image PNG valide (1 × 1 pixel) : signature réelle reconnue par file-type. */
export const IMAGE_PNG_VALIDE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

export const DOCUMENT_PDF_VALIDE = Buffer.from(
  '%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n',
);

/** Script malveillant déguisé : extension et type déclarés d'une image, contenu HTML. */
export const SCRIPT_DEGUISE_EN_IMAGE = Buffer.from(
  '<script>fetch("https://pirate.example")</script>',
);

export interface MissionCreee {
  id: string;
  title: string;
  status: string;
}

export async function creerMissionViaApi(
  application: Express,
  cookieRepartiteur: string,
  idChauffeur: string,
  codeSecret = 'QUAI-4821',
): Promise<MissionCreee> {
  const reponse = await request(application)
    .post('/api/missions')
    .set('Origin', ORIGINE_CLIENT)
    .set('Cookie', cookieRepartiteur)
    .send({
      title: 'Livraison IRM',
      destination: 'Hôpital Édouard-Herriot, Lyon',
      secret_code: codeSecret,
      driver_id: idChauffeur,
    });
  if (reponse.status !== 201) {
    throw new Error(`Création de mission de test impossible (statut ${String(reponse.status)})`);
  }
  return reponse.body as MissionCreee;
}

export function changerStatutViaApi(
  application: Express,
  cookieChauffeur: string,
  idMission: string,
  statut: string,
): request.Test {
  return request(application)
    .patch(`/api/missions/${idMission}/status`)
    .set('Origin', ORIGINE_CLIENT)
    .set('Cookie', cookieChauffeur)
    .send({ status: statut });
}

export function deposerFichierViaApi(
  application: Express,
  cookieChauffeur: string,
  idMission: string,
  fichier: { contenu: Buffer; nom: string; type: string },
): request.Test {
  return request(application)
    .post(`/api/missions/${idMission}/documents`)
    .set('Origin', ORIGINE_CLIENT)
    .set('Cookie', cookieChauffeur)
    .attach('file', fichier.contenu, { filename: fichier.nom, contentType: fichier.type });
}

import { Router } from 'express';
import {
  changerStatut,
  creerNouvelleMission,
  listerMissions,
} from '../controleurs/controleur-missions.js';
import { deposerPreuve, telechargerPreuve } from '../controleurs/controleur-preuves-livraison.js';
import { autoriserRoles } from '../intercepteurs/autoriser-roles.js';
import { exigerSession } from '../intercepteurs/exiger-session.js';
import { recevoirFichierUnique } from '../intercepteurs/recevoir-fichier.js';

/**
 * Contrat d'interface de l'Annexe 5. Toutes les routes exigent une session ; le rôle est
 * contrôlé avant tout traitement, y compris avant la réception d'un fichier.
 */
export function creerRoutesMissions(): Router {
  const routeur = Router();
  routeur.use(exigerSession);

  routeur.post('/', autoriserRoles('DISPATCHER'), creerNouvelleMission);
  routeur.get('/', autoriserRoles('DISPATCHER', 'DRIVER'), listerMissions);
  routeur.patch('/:idMission/status', autoriserRoles('DRIVER'), changerStatut);
  routeur.post(
    '/:idMission/documents',
    autoriserRoles('DRIVER'),
    recevoirFichierUnique,
    deposerPreuve,
  );
  routeur.get('/:idMission/documents/:idDocument', autoriserRoles('DISPATCHER'), telechargerPreuve);

  return routeur;
}

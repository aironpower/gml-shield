import { Router } from 'express';
import { listerChauffeursActifs } from '../../depots/depot-utilisateurs.js';
import { autoriserRoles } from '../intercepteurs/autoriser-roles.js';
import { exigerSession } from '../intercepteurs/exiger-session.js';

/** Liste des chauffeurs assignables, nécessaire au formulaire de création de mission. */
export function creerRoutesChauffeurs(): Router {
  const routeur = Router();

  routeur.get('/', exigerSession, autoriserRoles('DISPATCHER'), async (_requete, reponse) => {
    reponse.json(await listerChauffeursActifs());
  });

  return routeur;
}

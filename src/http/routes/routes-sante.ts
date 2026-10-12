import { Router } from 'express';

export function creerRoutesSante(): Router {
  const routeur = Router();

  routeur.get('/', (_requete, reponse) => {
    reponse.json({ statut: 'ok' });
  });

  return routeur;
}

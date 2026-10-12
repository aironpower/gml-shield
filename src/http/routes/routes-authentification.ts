import { Router } from 'express';
import {
  connecter,
  decrireSessionCourante,
  deconnecter,
} from '../controleurs/controleur-authentification.js';
import { exigerSession } from '../intercepteurs/exiger-session.js';
import { creerLimiteurTentativesConnexion } from '../intercepteurs/limiter-tentatives-connexion.js';

export function creerRoutesAuthentification(): Router {
  const routeur = Router();

  routeur.post('/login', creerLimiteurTentativesConnexion(), connecter);
  routeur.post('/logout', exigerSession, deconnecter);
  routeur.get('/me', exigerSession, decrireSessionCourante);

  return routeur;
}

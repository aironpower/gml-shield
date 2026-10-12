import type { RequestHandler } from 'express';
import { ErreurAccesRefuse } from '../../domaine/erreurs.js';
import type { RoleUtilisateur } from '../../domaine/utilisateur.js';
import { obtenirSession } from './exiger-session.js';

/**
 * Restreint une route aux rôles listés (403 sinon). Placé après exigerSession.
 * Ce contrôle porte sur le rôle uniquement ; l'appartenance d'une mission à l'utilisateur
 * (RG1, RG4) est vérifiée par les services, au plus près des données.
 */
export function autoriserRoles(...rolesAutorises: RoleUtilisateur[]): RequestHandler {
  return (requete, _reponse, suite) => {
    if (!rolesAutorises.includes(obtenirSession(requete).utilisateur.role)) {
      throw new ErreurAccesRefuse('Accès refusé pour ce rôle');
    }
    suite();
  };
}

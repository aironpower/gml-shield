import { appelerApi, ErreurApi } from './api.js';
import { afficherMessage, afficherNotification, afficherSeulement } from './interface.js';
import { ouvrirVueAdministration } from './vue-administration.js';
import { ouvrirVueChauffeur } from './vue-chauffeur.js';
import { ouvrirVueRepartiteur } from './vue-repartiteur.js';

/**
 * Routage conditionnel (Annexe 5 §5) : chaque rôle n'ouvre que sa propre vue.
 * Ce masquage n'est qu'un confort d'affichage ; la sécurité réelle est assurée par l'API,
 * qui refuse toute requête non autorisée quel que soit l'écran affiché.
 */
const VUES_PAR_ROLE = {
  DISPATCHER: ouvrirVueRepartiteur,
  DRIVER: ouvrirVueChauffeur,
  ADMIN: ouvrirVueAdministration,
};

let fermerVueCourante = () => undefined;

function ouvrirEspace(utilisateur) {
  document.getElementById('utilisateur-connecte').textContent =
    `${utilisateur.email} · ${utilisateur.role}`;
  document.getElementById('bouton-deconnexion').hidden = false;
  fermerVueCourante = VUES_PAR_ROLE[utilisateur.role]({ gererErreur, surSessionExpiree });
}

function afficherConnexion() {
  fermerVueCourante();
  fermerVueCourante = () => undefined;
  document.getElementById('utilisateur-connecte').textContent = '';
  document.getElementById('bouton-deconnexion').hidden = true;
  afficherSeulement('vue-connexion');
}

function surSessionExpiree() {
  afficherNotification('Votre session a expiré, reconnectez-vous.', 'erreur');
  afficherConnexion();
}

function gererErreur(erreur, identifiantZoneMessage) {
  if (erreur instanceof ErreurApi && erreur.statut === 401) {
    surSessionExpiree();
    return;
  }
  const message =
    erreur instanceof ErreurApi ? erreur.message : 'Serveur injoignable, vérifiez votre connexion.';
  if (identifiantZoneMessage === undefined) {
    afficherNotification(message, 'erreur');
    return;
  }
  afficherMessage(identifiantZoneMessage, message, 'erreur');
}

async function seConnecter(evenement) {
  evenement.preventDefault();
  const formulaire = evenement.target;
  try {
    const { user } = await appelerApi('/api/auth/login', {
      methode: 'POST',
      corpsJson: Object.fromEntries(new FormData(formulaire)),
    });
    formulaire.reset();
    afficherMessage('erreur-connexion', '');
    ouvrirEspace(user);
  } catch (erreur) {
    const message = erreur instanceof ErreurApi ? erreur.message : 'Serveur injoignable.';
    afficherMessage('erreur-connexion', message, 'erreur');
  }
}

async function seDeconnecter() {
  await appelerApi('/api/auth/logout', { methode: 'POST' }).catch(() => undefined);
  afficherConnexion();
}

/** Au chargement, une session encore valide (cookie) rouvre directement l'espace de l'utilisateur. */
async function demarrer() {
  document.getElementById('formulaire-connexion').addEventListener('submit', seConnecter);
  document.getElementById('bouton-deconnexion').addEventListener('click', seDeconnecter);
  try {
    const { user } = await appelerApi('/api/auth/me');
    ouvrirEspace(user);
  } catch {
    afficherConnexion();
  }
}

demarrer();

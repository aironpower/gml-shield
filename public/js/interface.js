const IDENTIFIANTS_VUES = [
  'vue-connexion',
  'vue-repartiteur',
  'vue-chauffeur',
  'vue-administration',
];
const DUREE_AFFICHAGE_NOTIFICATION_MS = 6000;

const LIBELLES_STATUTS = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
};

/**
 * Crée un élément du DOM.
 *
 * Pourquoi « textContent » et jamais « innerHTML » : toute donnée venant de l'API (titre,
 * destination, e-mail…) est insérée comme texte brut. Un titre de mission contenant
 * « <script> » s'affiche tel quel au lieu d'être exécuté (prévention XSS).
 */
export function creerElement(balise, { classe, texte, attributs = {} } = {}, enfants = []) {
  const element = document.createElement(balise);
  if (classe !== undefined) {
    element.className = classe;
  }
  if (texte !== undefined) {
    element.textContent = texte;
  }
  Object.entries(attributs).forEach(([nom, valeur]) => {
    element.setAttribute(nom, valeur);
  });
  element.append(...enfants);
  return element;
}

export function remplacerContenu(conteneur, enfants) {
  conteneur.replaceChildren(...enfants);
}

export function afficherSeulement(identifiantVue) {
  IDENTIFIANTS_VUES.forEach((identifiant) => {
    document.getElementById(identifiant).hidden = identifiant !== identifiantVue;
  });
}

export function creerPastilleStatut(statut) {
  return creerElement('span', {
    classe: `pastille pastille-${statut.toLowerCase()}`,
    texte: LIBELLES_STATUTS[statut] ?? statut,
  });
}

export function formaterDate(dateIso) {
  return new Date(dateIso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Notification visuelle éphémère (« toast »), annoncée aux lecteurs d'écran. */
export function afficherNotification(message, type = 'information') {
  const notification = creerElement('div', {
    classe: `notification notification-${type}`,
    texte: message,
  });
  document.getElementById('zone-notifications').append(notification);
  setTimeout(() => {
    notification.remove();
  }, DUREE_AFFICHAGE_NOTIFICATION_MS);
}

export function afficherMessage(identifiantZone, message, type = 'succes') {
  const zone = document.getElementById(identifiantZone);
  zone.textContent = message;
  zone.className = `message message-${type}`;
}

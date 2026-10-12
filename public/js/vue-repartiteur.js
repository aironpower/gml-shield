import { appelerApi } from './api.js';
import {
  afficherMessage,
  afficherSeulement,
  creerElement,
  creerPastilleStatut,
  formaterDate,
  remplacerContenu,
} from './interface.js';

/**
 * Vue Répartiteur : création de mission et suivi des missions créées (Annexe 5 §5).
 * Renvoie la fonction qui retire les écouteurs d'événements à la fermeture de la vue.
 */
export function ouvrirVueRepartiteur({ gererErreur }) {
  afficherSeulement('vue-repartiteur');
  const arretEcouteurs = new AbortController();
  const formulaire = document.getElementById('formulaire-mission');

  async function charger() {
    try {
      const chauffeurs = await appelerApi('/api/drivers');
      remplirChoixChauffeurs(chauffeurs);
      const emailsChauffeurs = new Map(
        chauffeurs.map((chauffeur) => [chauffeur.id, chauffeur.email]),
      );
      afficherMissions(await appelerApi('/api/missions'), emailsChauffeurs);
    } catch (erreur) {
      gererErreur(erreur);
    }
  }

  formulaire.addEventListener(
    'submit',
    (evenement) => {
      evenement.preventDefault();
      creerMission(formulaire, { gererErreur, recharger: charger });
    },
    { signal: arretEcouteurs.signal },
  );
  document
    .getElementById('actualiser-missions-repartiteur')
    .addEventListener('click', charger, { signal: arretEcouteurs.signal });
  charger();
  return () => {
    arretEcouteurs.abort();
  };
}

async function creerMission(formulaire, { gererErreur, recharger }) {
  try {
    const mission = await appelerApi('/api/missions', {
      methode: 'POST',
      corpsJson: Object.fromEntries(new FormData(formulaire)),
    });
    formulaire.reset();
    afficherMessage(
      'message-mission',
      `Mission « ${mission.title} » créée et transmise au chauffeur.`,
    );
    await recharger();
  } catch (erreur) {
    gererErreur(erreur, 'message-mission');
  }
}

function remplirChoixChauffeurs(chauffeurs) {
  const options = chauffeurs.map((chauffeur) =>
    creerElement('option', { texte: chauffeur.email, attributs: { value: chauffeur.id } }),
  );
  const optionInvite = creerElement('option', {
    texte: 'Choisir un chauffeur',
    attributs: { value: '' },
  });
  remplacerContenu(document.getElementById('choix-chauffeur'), [optionInvite, ...options]);
}

function afficherMissions(missions, emailsChauffeurs) {
  const lignes = missions.map((mission) =>
    creerElement('tr', {}, [
      creerElement('td', { texte: mission.title }),
      creerElement('td', { texte: mission.destination }),
      creerElement('td', { texte: emailsChauffeurs.get(mission.driver_id) ?? 'Chauffeur inactif' }),
      creerElement('td', {}, [creerPastilleStatut(mission.status)]),
      creerElement('td', { texte: formaterDate(mission.created_at) }),
      creerElement('td', {}, creerLiensPreuves(mission)),
    ]),
  );
  const ligneVide = creerElement('tr', {}, [
    creerElement('td', { texte: 'Aucune mission créée.', attributs: { colspan: '6' } }),
  ]);
  remplacerContenu(
    document.getElementById('corps-missions-repartiteur'),
    lignes.length > 0 ? lignes : [ligneVide],
  );
}

/** Lien direct vers l'API : le navigateur joint le cookie de session et télécharge le fichier. */
function creerLiensPreuves(mission) {
  if (mission.documents.length === 0) {
    return [creerElement('span', { classe: 'detail', texte: 'Aucune' })];
  }
  return mission.documents.map((preuve, position) =>
    creerElement('a', {
      classe: 'lien-telechargement',
      texte: `Preuve ${String(position + 1)} (${preuve.mime_type.split('/')[1].toUpperCase()})`,
      attributs: { href: `/api/missions/${mission.id}/documents/${preuve.id}`, download: '' },
    }),
  );
}

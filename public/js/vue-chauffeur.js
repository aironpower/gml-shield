import { appelerApi } from './api.js';
import {
  afficherNotification,
  afficherSeulement,
  creerElement,
  creerPastilleStatut,
  formaterDate,
  remplacerContenu,
} from './interface.js';
import { ecouterNouvellesMissions } from './temps-reel.js';

const MASQUE_CODE_SECRET = '••••••';
const DUREE_AFFICHAGE_CODE_MS = 30000;

/**
 * Vue Chauffeur : ses missions, révélation du code à la demande, dépôt de la preuve et
 * notification instantanée des nouvelles missions (Annexe 5 §5).
 * Renvoie la fonction qui ferme la connexion temps réel à la fermeture de la vue.
 */
export function ouvrirVueChauffeur({ gererErreur, surSessionExpiree }) {
  afficherSeulement('vue-chauffeur');
  const conteneur = document.getElementById('liste-missions-chauffeur');

  async function charger() {
    try {
      const missions = await appelerApi('/api/missions');
      const cartes = missions.map((mission) => creerCarteMission(mission, actions));
      const messageVide = creerElement('p', {
        classe: 'message',
        texte: 'Aucune mission assignée pour le moment.',
      });
      remplacerContenu(conteneur, cartes.length > 0 ? cartes : [messageVide]);
    } catch (erreur) {
      gererErreur(erreur);
    }
  }

  const actions = creerActionsMission({ gererErreur, recharger: charger });
  const arreterTempsReel = ecouterNouvellesMissions({
    surNouvelleMission: (mission) => {
      afficherNotification(`Nouvelle mission : ${mission.title} — ${mission.destination}`);
      charger();
    },
    surChangementEtat: afficherEtatTempsReel,
    surSessionExpiree,
  });
  charger();
  return arreterTempsReel;
}

/** Actions du chauffeur sur une mission : chaque succès est notifié puis la liste rechargée. */
function creerActionsMission({ gererErreur, recharger }) {
  async function executer(operation, messageSucces) {
    try {
      await operation();
      afficherNotification(messageSucces, 'succes');
      await recharger();
    } catch (erreur) {
      gererErreur(erreur);
    }
  }

  return {
    changerStatut: (mission, statut, messageSucces) =>
      executer(
        () =>
          appelerApi(`/api/missions/${mission.id}/status`, {
            methode: 'PATCH',
            corpsJson: { status: statut },
          }),
        messageSucces,
      ),
    deposerPreuve: (mission, fichier) => {
      const formulaire = new FormData();
      formulaire.append('file', fichier);
      return executer(
        () => appelerApi(`/api/missions/${mission.id}/documents`, { methode: 'POST', formulaire }),
        'Preuve de livraison enregistrée.',
      );
    },
  };
}

function afficherEtatTempsReel(estConnecte) {
  const pastille = document.getElementById('etat-temps-reel');
  pastille.textContent = estConnecte ? 'Temps réel : connecté' : 'Temps réel : reconnexion…';
  pastille.className = estConnecte ? 'pastille pastille-completed' : 'pastille pastille-pending';
}

function creerCarteMission(mission, actions) {
  return creerElement('article', { classe: 'carte carte-mission' }, [
    creerElement('div', { classe: 'titre-avec-action' }, [
      creerElement('h3', { texte: mission.title }),
      creerPastilleStatut(mission.status),
    ]),
    creerElement('p', { texte: `Destination : ${mission.destination}` }),
    creerElement('p', {
      classe: 'detail',
      texte: `Assignée le ${formaterDate(mission.created_at)}`,
    }),
    creerZoneCodeSecret(mission.secret_code),
    ...creerActions(mission, actions),
  ]);
}

/**
 * RG2 : le code est masqué par défaut, révélé uniquement à la demande, puis remasqué
 * automatiquement ; il ne reste pas lisible sur une tablette laissée sans surveillance.
 */
function creerZoneCodeSecret(codeSecret) {
  const valeur = creerElement('code', { classe: 'code-secret', texte: MASQUE_CODE_SECRET });
  const bouton = creerElement('button', {
    classe: 'bouton bouton-secondaire',
    texte: 'Révéler le code',
    attributs: { type: 'button' },
  });
  let minuterieMasquage;

  function basculer(reveler) {
    clearTimeout(minuterieMasquage);
    valeur.textContent = reveler ? codeSecret : MASQUE_CODE_SECRET;
    bouton.textContent = reveler ? 'Masquer le code' : 'Révéler le code';
    if (reveler) {
      minuterieMasquage = setTimeout(() => basculer(false), DUREE_AFFICHAGE_CODE_MS);
    }
  }

  bouton.addEventListener('click', () => basculer(valeur.textContent === MASQUE_CODE_SECRET));
  return creerElement('div', { classe: 'zone-code' }, [
    creerElement('span', { texte: "Code d'accès :" }),
    valeur,
    bouton,
  ]);
}

function creerActions(mission, actions) {
  if (mission.status === 'PENDING') {
    return [
      creerBouton('Démarrer la livraison', () =>
        actions.changerStatut(mission, 'IN_PROGRESS', 'Livraison démarrée.'),
      ),
    ];
  }
  if (mission.status === 'IN_PROGRESS') {
    const boutonCloture = creerBouton('Clôturer la mission', () =>
      actions.changerStatut(mission, 'COMPLETED', 'Mission clôturée.'),
    );
    boutonCloture.disabled = mission.documents.length === 0;
    return [creerFormulairePreuve(mission, actions), boutonCloture];
  }
  return [creerElement('p', { classe: 'message message-succes', texte: 'Livraison terminée.' })];
}

function creerFormulairePreuve(mission, actions) {
  const champFichier = creerElement('input', {
    attributs: {
      type: 'file',
      name: 'file',
      accept: 'image/jpeg,image/png,application/pdf',
      required: '',
    },
  });
  const formulaire = creerElement('form', { classe: 'formulaire formulaire-ligne' }, [
    creerElement('label', { texte: 'Preuve de livraison (photo ou PDF)' }, [champFichier]),
    creerElement('button', { classe: 'bouton', texte: 'Déposer', attributs: { type: 'submit' } }),
    creerElement('span', {
      classe: 'detail',
      texte: `${String(mission.documents.length)} preuve(s) déposée(s)`,
    }),
  ]);
  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const [fichier] = champFichier.files;
    if (fichier !== undefined) {
      actions.deposerPreuve(mission, fichier);
    }
  });
  return formulaire;
}

function creerBouton(libelle, surClic) {
  const bouton = creerElement('button', {
    classe: 'bouton',
    texte: libelle,
    attributs: { type: 'button' },
  });
  bouton.addEventListener('click', surClic);
  return bouton;
}

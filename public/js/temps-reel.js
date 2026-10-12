const CODE_FERMETURE_SESSION_EXPIREE = 4001;
const DELAI_RECONNEXION_INITIAL_MS = 1000;
const DELAI_RECONNEXION_MAXIMAL_MS = 30000;

/**
 * Ouvre la connexion temps réel et appelle `surNouvelleMission` à chaque événement NEW_MISSION.
 *
 * Aucune authentification explicite : le navigateur joint le cookie de session à la demande
 * de connexion, et le serveur la refuse sans session valide.
 * Pourquoi un délai de reconnexion croissant : sur la route, le réseau mobile coupe souvent ;
 * le client se reconnecte seul, sans saturer le serveur de tentatives.
 * Renvoie une fonction qui ferme définitivement la connexion (déconnexion de l'utilisateur).
 */
export function ecouterNouvellesMissions({
  surNouvelleMission,
  surChangementEtat,
  surSessionExpiree,
}) {
  let connexion;
  let arretDemande = false;
  let delaiReconnexion = DELAI_RECONNEXION_INITIAL_MS;

  function ouvrir() {
    const protocole = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    connexion = new WebSocket(`${protocole}//${window.location.host}/ws`);
    connexion.addEventListener('open', () => {
      delaiReconnexion = DELAI_RECONNEXION_INITIAL_MS;
      surChangementEtat(true);
    });
    connexion.addEventListener('message', (evenement) => {
      const donnees = JSON.parse(evenement.data);
      if (donnees.type === 'NEW_MISSION') {
        surNouvelleMission(donnees.mission);
      }
    });
    connexion.addEventListener('close', (evenement) => {
      surChangementEtat(false);
      if (arretDemande) {
        return;
      }
      if (evenement.code === CODE_FERMETURE_SESSION_EXPIREE) {
        surSessionExpiree();
        return;
      }
      setTimeout(ouvrir, delaiReconnexion);
      delaiReconnexion = Math.min(delaiReconnexion * 2, DELAI_RECONNEXION_MAXIMAL_MS);
    });
  }

  ouvrir();
  return () => {
    arretDemande = true;
    connexion.close();
  };
}

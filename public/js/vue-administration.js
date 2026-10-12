import { appelerApi } from './api.js';
import { afficherSeulement, creerElement, formaterDate, remplacerContenu } from './interface.js';

const STATUT_HTTP_MINIMAL_ECHEC = 400;

/** Vue Admin Sécurité : consultation du journal d'audit (lecture seule). */
export function ouvrirVueAdministration({ gererErreur }) {
  afficherSeulement('vue-administration');
  const arretEcouteurs = new AbortController();

  async function charger() {
    try {
      const traces = await appelerApi('/api/audit-logs');
      remplacerContenu(document.getElementById('corps-journal-audit'), traces.map(creerLigneTrace));
    } catch (erreur) {
      gererErreur(erreur);
    }
  }

  document
    .getElementById('actualiser-journal')
    .addEventListener('click', charger, { signal: arretEcouteurs.signal });
  charger();
  return () => {
    arretEcouteurs.abort();
  };
}

/** Les refus (statut 4xx ou 5xx) sont mis en évidence : ce sont eux qui signalent une attaque. */
function creerLigneTrace(trace) {
  const estUnEchec = (trace.http_status ?? 0) >= STATUT_HTTP_MINIMAL_ECHEC;
  return creerElement('tr', { classe: estUnEchec ? 'ligne-echec' : '' }, [
    creerElement('td', { texte: formaterDate(trace.timestamp) }),
    creerElement('td', { texte: trace.email ?? 'Anonyme' }),
    creerElement('td', { texte: trace.action }),
    creerElement('td', { texte: trace.ip_address ?? '—' }),
    creerElement('td', { texte: String(trace.http_status ?? '—') }),
  ]);
}

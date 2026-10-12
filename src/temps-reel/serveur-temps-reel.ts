import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { parseCookie } from 'cookie';
import { WebSocketServer, type WebSocket } from 'ws';
import { journalApplicatif } from '../infrastructure/journal-applicatif.js';
import { verifierSession, type SessionUtilisateur } from '../services/service-authentification.js';
import { NOM_COOKIE_SESSION } from '../http/cookie-session.js';
import { enregistrerConnexion } from './hub-notifications.js';

export const CHEMIN_TEMPS_REEL = '/ws';
const TAILLE_MAXIMALE_MESSAGE_OCTETS = 1024;
const CODE_FERMETURE_SESSION_EXPIREE = 4001;

/**
 * Greffe le serveur WebSocket sur le serveur HTTPS existant (même port, même certificat TLS :
 * en production la connexion est donc chiffrée en WSS).
 *
 * Pourquoi authentifier pendant la poignée de main (« upgrade ») plutôt qu'après : une
 * connexion non authentifiée n'est jamais établie, elle ne consomme aucune ressource et ne
 * peut recevoir aucun événement.
 */
export function brancherServeurTempsReel(serveurHttp: Server, origineAutorisee: string): void {
  const serveurWebSocket = new WebSocketServer({
    noServer: true,
    maxPayload: TAILLE_MAXIMALE_MESSAGE_OCTETS,
  });

  serveurHttp.on('upgrade', (requete: IncomingMessage, socket: Duplex, entete: Buffer) => {
    void accepterSiAutorise({ requete, socket, entete, origineAutorisee, serveurWebSocket });
  });
}

interface DemandeConnexion {
  requete: IncomingMessage;
  socket: Duplex;
  entete: Buffer;
  origineAutorisee: string;
  serveurWebSocket: WebSocketServer;
}

/**
 * Trois contrôles avant d'accepter :
 * 1. le chemin attendu ;
 * 2. l'origine : le navigateur envoie les cookies avec une demande WebSocket venue de
 *    n'importe quel site ; sans ce contrôle, une page malveillante pourrait ouvrir la connexion
 *    au nom du chauffeur et lire ses missions (Cross-Site WebSocket Hijacking) ;
 * 3. la session : même jeton, mêmes vérifications (révocation, compte actif) que l'API REST.
 */
async function accepterSiAutorise(demande: DemandeConnexion): Promise<void> {
  const { requete, socket, entete, serveurWebSocket } = demande;
  if (new URL(requete.url ?? '/', 'http://localhost').pathname !== CHEMIN_TEMPS_REEL) {
    refuserConnexion(socket, '404 Not Found');
    return;
  }
  if (requete.headers.origin !== demande.origineAutorisee) {
    refuserConnexion(socket, '403 Forbidden');
    return;
  }
  const session = await authentifier(requete);
  if (session === undefined) {
    refuserConnexion(socket, '401 Unauthorized');
    return;
  }
  serveurWebSocket.handleUpgrade(requete, socket, entete, (connexion) => {
    ouvrirConnexion(connexion, session);
  });
}

async function authentifier(requete: IncomingMessage): Promise<SessionUtilisateur | undefined> {
  try {
    const cookies = parseCookie(requete.headers.cookie ?? '');
    return await verifierSession(cookies[NOM_COOKIE_SESSION]);
  } catch {
    return undefined;
  }
}

/** La connexion est fermée à l'expiration du jeton : elle ne survit pas à la session. */
function ouvrirConnexion(connexion: WebSocket, session: SessionUtilisateur): void {
  enregistrerConnexion(session.utilisateur.id, connexion);
  const delaiAvantExpiration = Math.max(session.expiration.getTime() - Date.now(), 0);
  const minuterieExpiration = setTimeout(() => {
    connexion.close(CODE_FERMETURE_SESSION_EXPIREE, 'Session expirée');
  }, delaiAvantExpiration);
  connexion.on('close', () => {
    clearTimeout(minuterieExpiration);
  });
  journalApplicatif.debug(
    { idUtilisateur: session.utilisateur.id },
    'Connexion temps réel ouverte',
  );
}

function refuserConnexion(socket: Duplex, statut: string): void {
  socket.end(`HTTP/1.1 ${statut}\r\nConnection: close\r\n\r\n`);
}

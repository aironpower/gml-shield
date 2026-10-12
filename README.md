# GML-SHIELD

Messagerie opérationnelle sécurisée de **GreenMove Logistics** : les répartiteurs transmettent aux chauffeurs leurs missions (destination, code d'accès à l'entrepôt) de façon authentifiée, chiffrée et traçable, en remplacement des SMS, e-mails et boucles WhatsApp.

**Application en ligne : https://gml-shield.onrender.com** (offre gratuite : le premier chargement après une période d'inactivité peut prendre une minute).

Comptes de démonstration : `admin@gml-shield.test`, `repartiteur@gml-shield.test`, `chauffeur.martin@gml-shield.test`, `chauffeur.durand@gml-shield.test`. Leur mot de passe n'est pas publié dans ce dépôt ; il est communiqué séparément.

## Démarrage local

Prérequis : Node.js 22 ou plus, Docker.

```bash
npm ci
cp .env.example .env   # puis renseigner SECRET_JWT, CLE_CHIFFREMENT_SECRETS et MOT_DE_PASSE_COMPTES_DEMO
docker compose up -d   # PostgreSQL local (bases gml_shield et gml_shield_test)
npm run migrer         # crée ou met à jour le schéma
npm run comptes:demo   # crée un admin, un répartiteur et deux chauffeurs de démonstration
npm run stockage:preparer   # production uniquement : crée ou réaligne le compartiment privé Supabase
npm run dev            # serveur sur http://localhost:3000/api/sante
```

Les tests (`npm test`) mettent automatiquement à jour le schéma de la base `gml_shield_test` ; chaque test s'exécute dans une transaction annulée.

## API

| Méthode et route                            | Accès              | Rôle                                                                                   |
| ------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| `GET /api/sante`                            | public             | Disponibilité du service                                                               |
| `POST /api/auth/login`                      | public             | Ouvre une session : jeton JWT de 15 min en cookie HttpOnly                             |
| `GET /api/auth/me`                          | session            | Utilisateur de la session courante                                                     |
| `POST /api/auth/logout`                     | session            | Révoque le jeton immédiatement                                                         |
| `GET /api/drivers`                          | DISPATCHER         | Chauffeurs actifs assignables                                                          |
| `POST /api/missions`                        | DISPATCHER         | Crée une mission ; le code d'accès est chiffré (AES-256-GCM) avant insertion           |
| `GET /api/missions`                         | DISPATCHER, DRIVER | Répartiteur : ses missions, sans code. Chauffeur : ses seules missions, code déchiffré |
| `PATCH /api/missions/{id}/status`           | DRIVER             | PENDING → IN_PROGRESS → COMPLETED (preuve exigée pour clôturer)                        |
| `POST /api/missions/{id}/documents`         | DRIVER             | Preuve (champ `file`) : JPEG, PNG ou PDF vérifiés par leur contenu, 10 Mo maximum      |
| `GET /api/missions/{id}/documents/{doc_id}` | DISPATCHER         | Téléchargement de la preuve d'une de ses missions                                      |
| `wss://…/ws`                                | session            | Événement `NEW_MISSION` poussé au seul chauffeur assigné                               |

Toute requête `POST`, `PUT`, `PATCH` ou `DELETE` doit porter l'en-tête `Origin` du client autorisé (`ORIGINE_AUTORISEE`) et est inscrite au journal d'audit.

## Déploiement

| Élément                                      | Hébergement                                        | Sécurité                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Serveur Node.js (API, WebSocket, client web) | Render, région Francfort, décrit par `render.yaml` | HTTPS / WSS de bout en bout, secrets générés par Render                                                                  |
| PostgreSQL 17                                | Supabase, région Paris, via le pooler IPv4         | TLS avec vérification du certificat (`certificats/supabase-ca-2021.crt`), API de données Supabase désactivée, RLS activé |
| Preuves de livraison                         | Compartiment privé Supabase Storage                | Aucune URL publique, accès par clé secrète côté serveur uniquement                                                       |

Chaque fusion dans `main` redéploie automatiquement le service ; le démarrage applique les migrations en attente. Le schéma et les comptes de démonstration de la base de production sont initialisés depuis un poste d'administration :

```bash
DATABASE_URL=<url du pooler Supabase> CHEMIN_CERTIFICAT_CA_BASE=certificats/supabase-ca-2021.crt npm run migrer
DATABASE_URL=<url du pooler Supabase> CHEMIN_CERTIFICAT_CA_BASE=certificats/supabase-ca-2021.crt npm run comptes:demo
```

## Commandes qualité

| Commande                  | Rôle                                                   |
| ------------------------- | ------------------------------------------------------ |
| `npm run format:verifier` | Vérifie le formatage Prettier                          |
| `npm run lint`            | Analyse statique ESLint (règles du guide qualité)      |
| `npm run typage`          | Vérification TypeScript stricte                        |
| `npm run test:couverture` | Tests Vitest et seuils de couverture                   |
| `npm run verifier`        | Les quatre contrôles ci-dessus, tels qu'exécutés en CI |

## Organisation du code

```
src/
├── serveur.ts                 Point d'entrée : ouvre le port réseau
├── configuration/             Variables d'environnement validées au démarrage
├── domaine/                   Types et erreurs métier, sans dépendance technique
├── services/                  Règles métier (authentification…)
├── depots/                    Accès aux données : SQL paramétré uniquement
├── http/                      Couche HTTP : routes, contrôleurs, intercepteurs
├── temps-reel/                Serveur WebSocket authentifié et diffusion ciblée
├── infrastructure/            Services techniques : journalisation, base de données, sécurité, stockage
├── migrer.ts                  Point d'entrée : applique les migrations
├── creer-comptes-demo.ts      Point d'entrée : crée les comptes de démonstration
└── preparer-stockage.ts       Point d'entrée : prépare le compartiment privé des preuves
public/                        Client web (HTML, CSS, JavaScript sans framework)
migrations/                    Schéma SQL versionné (une migration = un changement)
certificats/                   Certificat racine public de l'autorité TLS de Supabase
outils/postgres/               Initialisation du PostgreSQL local (docker-compose)
tests/                         Tests automatisés, miroir de src/
```

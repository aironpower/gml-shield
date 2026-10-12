# GML-SHIELD

Messagerie opérationnelle sécurisée de **GreenMove Logistics** : les répartiteurs transmettent aux chauffeurs leurs missions (destination, code d'accès à l'entrepôt) de façon authentifiée, chiffrée et traçable, en remplacement des SMS, e-mails et boucles WhatsApp.

## Démarrage local

Prérequis : Node.js 22 ou plus, Docker.

```bash
npm ci
cp .env.example .env
docker compose up -d   # PostgreSQL local (bases gml_shield et gml_shield_test)
npm run migrer         # crée ou met à jour le schéma
npm run dev            # serveur sur http://localhost:3000/api/sante
```

Les tests (`npm test`) mettent automatiquement à jour le schéma de la base `gml_shield_test` ; chaque test s'exécute dans une transaction annulée.

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
├── http/                      Couche HTTP : application, routes, intercepteurs
├── infrastructure/            Services techniques : journalisation, base de données
└── migrer.ts                  Point d'entrée : applique les migrations
migrations/                    Schéma SQL versionné (une migration = un changement)
outils/postgres/               Initialisation du PostgreSQL local (docker-compose)
tests/                         Tests automatisés, miroir de src/
```

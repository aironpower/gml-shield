# GML-SHIELD

Messagerie opérationnelle sécurisée de **GreenMove Logistics** : les répartiteurs transmettent aux chauffeurs leurs missions (destination, code d'accès à l'entrepôt) de façon authentifiée, chiffrée et traçable, en remplacement des SMS, e-mails et boucles WhatsApp.

## Démarrage local

Prérequis : Node.js 22 ou plus.

```bash
npm ci
cp .env.example .env
npm run dev          # serveur sur http://localhost:3000/api/sante
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
├── http/                      Couche HTTP : application, routes, intercepteurs
└── infrastructure/            Services techniques (journalisation…)
tests/                         Tests automatisés, miroir de src/
```

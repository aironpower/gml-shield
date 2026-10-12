import { z } from 'zod';

/**
 * Configuration lue une seule fois au démarrage et validée par schéma.
 *
 * Pourquoi : une variable manquante ou mal formée doit faire échouer le démarrage
 * immédiatement (fail fast), plutôt que de produire un comportement dégradé en production.
 * Les noms imposés par la plateforme d'hébergement (PORT, NODE_ENV, DATABASE_URL) sont
 * conservés tels quels.
 */
const schemaEnvironnement = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  NIVEAU_JOURNAL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
  NOMBRE_PROXYS_DE_CONFIANCE: z.coerce.number().int().min(0).max(5).default(0),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // 32 caractères minimum : en dessous, la clé HMAC du jeton devient attaquable par force brute.
  SECRET_JWT: z.string().min(32),
  DUREE_SESSION_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  // Normalisée en origine (schéma + hôte + port) pour être comparée à l'en-tête Origin.
  ORIGINE_AUTORISEE: z.url().transform((url) => new URL(url).origin),
});

export type Environnement = z.infer<typeof schemaEnvironnement>;

export const environnement: Environnement = schemaEnvironnement.parse(process.env);

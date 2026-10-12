import { z } from 'zod';

/**
 * Configuration lue une seule fois au démarrage et validée par schéma.
 *
 * Pourquoi : une variable manquante ou mal formée doit faire échouer le démarrage
 * immédiatement (fail fast), plutôt que de produire un comportement dégradé en production.
 * Les noms imposés par la plateforme d'hébergement (PORT, NODE_ENV) sont conservés tels quels.
 */
const schemaEnvironnement = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  NIVEAU_JOURNAL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
});

export type Environnement = z.infer<typeof schemaEnvironnement>;

export const environnement: Environnement = schemaEnvironnement.parse(process.env);

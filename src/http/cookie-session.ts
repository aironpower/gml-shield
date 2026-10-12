import type { CookieOptions, Request } from 'express';
import { z } from 'zod';
import { environnement } from '../configuration/environnement.js';

export const NOM_COOKIE_SESSION = 'gml_session';

const schemaCookies = z.object({ [NOM_COOKIE_SESSION]: z.string().optional() });

/**
 * Options du cookie qui transporte le jeton de session (Annexe 5 §5 : prévention XSS/CSRF).
 *
 * - httpOnly : le JavaScript de la page ne peut pas lire le jeton, donc un script injecté
 *   (XSS) ne peut pas le voler, contrairement à un stockage dans localStorage.
 * - sameSite strict : le navigateur n'envoie jamais le cookie depuis un autre site, ce qui
 *   neutralise la falsification de requête inter-sites (CSRF).
 * - secure en production : le cookie ne circule que sur HTTPS.
 */
const OPTIONS_COOKIE_SESSION: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: environnement.NODE_ENV === 'production',
  path: '/',
};

export function optionsCookieSession(expiration: Date): CookieOptions {
  return { ...OPTIONS_COOKIE_SESSION, expires: expiration };
}

export function optionsEffacementCookieSession(): CookieOptions {
  return OPTIONS_COOKIE_SESSION;
}

export function lireJetonDuCookie(requete: Request): string | undefined {
  const cookies = schemaCookies.safeParse(requete.cookies);
  return cookies.success ? cookies.data[NOM_COOKIE_SESSION] : undefined;
}

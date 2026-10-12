/** Erreur renvoyée par l'API ; le statut permet aux vues de réagir (401 : session terminée). */
export class ErreurApi extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

/**
 * Appelle l'API GML-SHIELD.
 *
 * Pourquoi aucun jeton n'est manipulé ici : il voyage dans un cookie HttpOnly que le
 * navigateur joint lui-même aux requêtes. Le JavaScript ne le voit jamais, donc un script
 * injecté dans la page ne pourrait pas le voler (Annexe 5 §5, prévention XSS).
 * Le navigateur ajoute aussi l'en-tête Origin, contrôlé par le serveur (prévention CSRF).
 */
export async function appelerApi(chemin, { methode = 'GET', corpsJson, formulaire } = {}) {
  const options = { method: methode, credentials: 'same-origin', headers: {} };
  if (corpsJson !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(corpsJson);
  }
  if (formulaire !== undefined) {
    options.body = formulaire;
  }

  const reponse = await fetch(chemin, options);
  if (reponse.status === 204) {
    return undefined;
  }
  const contenu = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, contenu.error ?? 'Erreur inattendue');
  }
  return contenu;
}

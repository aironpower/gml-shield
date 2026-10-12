/**
 * Erreurs prévues par les règles métier, dont le message peut être montré à l'utilisateur.
 *
 * Pourquoi des classes dédiées : les services expriment un refus métier sans connaître HTTP ;
 * seul le gestionnaire d'erreurs traduit chaque classe en statut. Toute erreur qui n'hérite
 * pas de ErreurApplicative est considérée comme imprévue et son message n'est jamais exposé.
 */
export abstract class ErreurApplicative extends Error {
  abstract readonly statutHttp: number;
}

export class ErreurAuthentification extends ErreurApplicative {
  readonly statutHttp = 401;
}

export class ErreurAccesRefuse extends ErreurApplicative {
  readonly statutHttp = 403;
}

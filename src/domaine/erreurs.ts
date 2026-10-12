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

/**
 * Renvoyée aussi lorsqu'une ressource existe mais appartient à un autre utilisateur :
 * répondre 403 confirmerait son existence à un utilisateur qui n'a pas à la connaître (RG1).
 */
export class ErreurRessourceIntrouvable extends ErreurApplicative {
  readonly statutHttp = 404;
}

/** L'opération est valide en soi mais incompatible avec l'état actuel de la ressource. */
export class ErreurConflit extends ErreurApplicative {
  readonly statutHttp = 409;
}

export class ErreurTypeFichierRefuse extends ErreurApplicative {
  readonly statutHttp = 415;
}

/** Données bien formées mais qui violent une règle métier (ex. chauffeur inexistant). */
export class ErreurRegleMetier extends ErreurApplicative {
  readonly statutHttp = 422;
}

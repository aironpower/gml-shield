-- Up Migration

-- Liste de révocation des jetons (Annexe 5 : « mécanisme permettant sa révocation »).
-- Seul l'identifiant unique du jeton (jti) est stocké, jamais le jeton lui-même :
-- une fuite de cette table ne permet pas de se connecter.
CREATE TABLE revoked_tokens (
  jti        uuid PRIMARY KEY,
  -- Au-delà de cette date le jeton est expiré de toute façon : la ligne peut être purgée.
  expires_at timestamptz NOT NULL
);

CREATE INDEX revoked_tokens_expires_at_idx ON revoked_tokens (expires_at);

-- Down Migration

DROP TABLE revoked_tokens;

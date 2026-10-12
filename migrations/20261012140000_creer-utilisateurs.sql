-- Up Migration

-- Les rôles sont un type énuméré : PostgreSQL refuse toute autre valeur,
-- même si une requête contourne la validation applicative.
CREATE TYPE user_role AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER');

CREATE TABLE users (
  -- UUID plutôt qu'entier séquentiel : un identifiant non devinable empêche
  -- d'énumérer les comptes en incrémentant un numéro (OWASP A01 - IDOR).
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- L'adresse est stockée en minuscules pour garantir l'unicité sans ambiguïté de casse.
  email         text NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) <= 254),
  -- Seule l'empreinte Argon2id est stockée, jamais le mot de passe (Annexe 1).
  password_hash text NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
  role          user_role NOT NULL,
  -- Un compte n'est jamais supprimé (les journaux d'audit y font référence) : il est désactivé.
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE users;
DROP TYPE user_role;

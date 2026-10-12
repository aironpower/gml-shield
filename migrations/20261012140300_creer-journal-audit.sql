-- Up Migration

CREATE TABLE audit_logs (
  -- Identité séquentielle : l'ordre d'insertion est visible et un trou dans la
  -- séquence signale une anomalie lors d'une revue de sécurité.
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Nul pour une tentative de connexion sur un compte inconnu.
  user_id     uuid REFERENCES users (id) ON DELETE RESTRICT,
  action      text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 200),
  ip_address  inet,
  -- Statut HTTP de la réponse : distingue une action réussie d'une tentative refusée.
  http_status smallint CHECK (http_status BETWEEN 100 AND 599),
  timestamp   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX audit_logs_timestamp_idx ON audit_logs (timestamp);

-- Journal en ajout seul : toute modification ou suppression est refusée par la base,
-- quel que soit le code applicatif. Limite assumée : un superutilisateur peut encore
-- supprimer ce déclencheur (point traité dans l'audit d'évolutivité, NIS2 art. 21).
CREATE FUNCTION forbid_audit_log_tampering() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit est en ajout seul : % interdit', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_log_tampering();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_audit_log_tampering();

-- Down Migration

DROP TABLE audit_logs;
DROP FUNCTION forbid_audit_log_tampering();

-- Up Migration

CREATE TYPE mission_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE missions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  destination   text NOT NULL CHECK (char_length(destination) BETWEEN 1 AND 500),
  -- RG2 : le code d'accès est stocké chiffré (AES-256-GCM : vecteur d'initialisation,
  -- étiquette d'authenticité et texte chiffré concaténés). La clé n'est jamais en base :
  -- un administrateur de la base ne voit que des octets illisibles.
  secret_code   bytea NOT NULL,
  status        mission_status NOT NULL DEFAULT 'PENDING',
  -- ON DELETE RESTRICT : une mission ne doit jamais perdre la trace de ses acteurs.
  driver_id     uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  dispatcher_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index sur les deux filtres de cloisonnement (RG1) : chaque liste de missions
-- est filtrée par chauffeur ou par répartiteur.
CREATE INDEX missions_driver_id_idx ON missions (driver_id);
CREATE INDEX missions_dispatcher_id_idx ON missions (dispatcher_id);

-- RG3 : le statut évolue uniquement PENDING -> IN_PROGRESS -> COMPLETED.
-- Défense en profondeur : la règle est aussi vérifiée par l'application, mais la base
-- la garantit même face à une requête directe ou à un bogue applicatif.
CREATE FUNCTION enforce_linear_mission_status() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status = 'PENDING' AND NEW.status = 'IN_PROGRESS')
     OR (OLD.status = 'IN_PROGRESS' AND NEW.status = 'COMPLETED') THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Transition de statut interdite : % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER missions_linear_status
  BEFORE UPDATE OF status ON missions
  FOR EACH ROW EXECUTE FUNCTION enforce_linear_mission_status();

-- Down Migration

DROP TABLE missions;
DROP FUNCTION enforce_linear_mission_status();
DROP TYPE mission_status;

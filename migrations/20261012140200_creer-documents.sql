-- Up Migration

CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id  uuid NOT NULL REFERENCES missions (id) ON DELETE RESTRICT,
  -- Clé de l'objet dans le stockage privé, jamais une URL publique :
  -- le fichier n'est accessible qu'au travers de l'API, après contrôle des droits.
  file_path   text NOT NULL UNIQUE,
  -- Seuls les types réellement détectés dans le contenu du fichier sont admis
  -- (photo ou PDF de preuve de livraison) : aucun script ne peut être enregistré.
  mime_type   text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes  integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  -- RG4 : l'auteur du dépôt est conservé pour prouver qu'il s'agit du chauffeur assigné.
  uploaded_by uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_mission_id_idx ON documents (mission_id);

-- Down Migration

DROP TABLE documents;

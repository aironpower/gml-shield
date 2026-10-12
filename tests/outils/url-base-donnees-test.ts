// Base locale du docker-compose (ou service PostgreSQL de la CI) : aucun mot de passe versionné.
export const URL_BASE_DONNEES_TEST =
  process.env.DATABASE_URL_TEST ?? 'postgres://gml_shield@127.0.0.1:5433/gml_shield_test';

import { poolConnexions } from '../infrastructure/base-de-donnees/pool-connexions.js';

export async function revoquerJeton(idJeton: string, expiration: Date): Promise<void> {
  await poolConnexions.query(
    'INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING',
    [idJeton, expiration],
  );
}

export async function estJetonRevoque(idJeton: string): Promise<boolean> {
  const resultat = await poolConnexions.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [
    idJeton,
  ]);
  return resultat.rowCount === 1;
}

import { describe, expect, it } from 'vitest';
import { poolConnexions } from '../../src/infrastructure/base-de-donnees/pool-connexions.js';
import {
  COMPTES_DEMONSTRATION,
  creerComptesDemonstration,
} from '../../src/services/service-comptes-demonstration.js';

describe('Comptes de démonstration', () => {
  it('crée un compte par rôle et deux chauffeurs, sans doublon si relancé', async () => {
    await creerComptesDemonstration('Demonstration-2026');
    const comptesCreesAuSecondPassage = await creerComptesDemonstration('Demonstration-2026');

    const resultat = await poolConnexions.query<{ role: string }>(
      'SELECT role FROM users WHERE email = ANY($1::text[]) ORDER BY role',
      [COMPTES_DEMONSTRATION.map((compte) => compte.email)],
    );
    expect(comptesCreesAuSecondPassage).toBe(0);
    expect(resultat.rows.map((ligne) => ligne.role)).toEqual([
      'ADMIN',
      'DISPATCHER',
      'DRIVER',
      'DRIVER',
    ]);
  });

  it('refuse un mot de passe de démonstration trop court', async () => {
    await expect(creerComptesDemonstration('court')).rejects.toThrow(/trop court/);
  });
});

import { describe, expect, it } from 'vitest';
import {
  chiffrerSecret,
  dechiffrerSecret,
} from '../../src/infrastructure/securite/chiffrement-secrets.js';

const ID_MISSION = '0b5a7a3e-8c1f-4f0e-9a51-2f7d2c1e9b10';

describe('Chiffrement des codes d’accès (AES-256-GCM)', () => {
  it('restitue le code d’origine après chiffrement puis déchiffrement', () => {
    const donneesChiffrees = chiffrerSecret('QUAI-4821', ID_MISSION);

    expect(dechiffrerSecret(donneesChiffrees, ID_MISSION)).toBe('QUAI-4821');
  });

  it('ne laisse jamais apparaître le code en clair dans les octets stockés (RG2)', () => {
    const donneesChiffrees = chiffrerSecret('QUAI-4821', ID_MISSION);

    expect(donneesChiffrees.toString('latin1')).not.toContain('QUAI-4821');
  });

  it('produit des octets différents pour un même code (vecteur aléatoire)', () => {
    const premier = chiffrerSecret('QUAI-4821', ID_MISSION);
    const second = chiffrerSecret('QUAI-4821', ID_MISSION);

    expect(premier.equals(second)).toBe(false);
  });

  it('détecte la moindre altération des octets stockés', () => {
    const donneesChiffrees = chiffrerSecret('QUAI-4821', ID_MISSION);
    const dernierOctet = donneesChiffrees.length - 1;
    donneesChiffrees.writeUInt8(donneesChiffrees.readUInt8(dernierOctet) ^ 0xff, dernierOctet);

    expect(() => dechiffrerSecret(donneesChiffrees, ID_MISSION)).toThrow();
  });

  it('refuse de déchiffrer un code recopié depuis une autre mission', () => {
    const donneesChiffrees = chiffrerSecret('QUAI-4821', ID_MISSION);

    expect(() =>
      dechiffrerSecret(donneesChiffrees, '11111111-2222-4333-8444-555555555555'),
    ).toThrow();
  });

  it('refuse un format de données inconnu', () => {
    const donneesChiffrees = chiffrerSecret('QUAI-4821', ID_MISSION);
    donneesChiffrees.writeUInt8(99, 0);

    expect(() => dechiffrerSecret(donneesChiffrees, ID_MISSION)).toThrow(/Format/);
  });
});

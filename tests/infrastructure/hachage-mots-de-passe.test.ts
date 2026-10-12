import { describe, expect, it } from 'vitest';
import {
  hacherMotDePasse,
  verifierMotDePasse,
} from '../../src/infrastructure/securite/hachage-mots-de-passe.js';

describe('Hachage des mots de passe', () => {
  it('produit une empreinte Argon2id avec les paramètres OWASP', async () => {
    const empreinte = await hacherMotDePasse('MotDePasse!2026');

    expect(empreinte).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(empreinte).not.toContain('MotDePasse!2026');
  });

  it('produit deux empreintes différentes pour le même mot de passe (sel aléatoire)', async () => {
    const [premiere, seconde] = await Promise.all([
      hacherMotDePasse('MotDePasse!2026'),
      hacherMotDePasse('MotDePasse!2026'),
    ]);

    expect(premiere).not.toBe(seconde);
  });

  it('reconnaît le bon mot de passe et rejette les autres', async () => {
    const empreinte = await hacherMotDePasse('MotDePasse!2026');

    await expect(verifierMotDePasse(empreinte, 'MotDePasse!2026')).resolves.toBe(true);
    await expect(verifierMotDePasse(empreinte, 'motdepasse!2026')).resolves.toBe(false);
  });
});

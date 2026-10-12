import { describe, expect, it } from 'vitest';
import {
  creerJournalApplicatif,
  VALEUR_MASQUEE,
} from '../../src/infrastructure/journal-applicatif.js';

function journaliserEtCapturer(objet: object): string {
  const lignesEcrites: string[] = [];
  const journal = creerJournalApplicatif('info', {
    write: (ligne: string) => lignesEcrites.push(ligne),
  });

  journal.info(objet, 'test de masquage');

  return lignesEcrites.join('');
}

describe('Journal applicatif : masquage des secrets', () => {
  it('masque le mot de passe présent dans le corps d’une requête journalisée', () => {
    const ligne = journaliserEtCapturer({
      req: { body: { email: 'chauffeur@gml.test', password: 'MotDePasse!2026' } },
    });

    expect(ligne).not.toContain('MotDePasse!2026');
    expect(ligne).toContain(VALEUR_MASQUEE);
    expect(ligne).toContain('chauffeur@gml.test');
  });

  it('masque un code d’accès d’entrepôt au premier niveau comme en profondeur', () => {
    const ligne = journaliserEtCapturer({
      secret_code: 'CODE-QUAI-4821',
      mission: { secret_code: 'CODE-QUAI-9917' },
    });

    expect(ligne).not.toContain('CODE-QUAI-4821');
    expect(ligne).not.toContain('CODE-QUAI-9917');
  });

  it('masque les en-têtes d’authentification et les cookies', () => {
    const ligne = journaliserEtCapturer({
      req: { headers: { authorization: 'Bearer jeton.secret', cookie: 'session=abc' } },
    });

    expect(ligne).not.toContain('jeton.secret');
    expect(ligne).not.toContain('session=abc');
  });
});

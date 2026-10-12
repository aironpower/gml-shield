import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { creerApplication } from '../../src/http/application.js';
import { journalApplicatif } from '../../src/infrastructure/journal-applicatif.js';
import { ORIGINE_CLIENT } from '../outils/sessions-test.js';

vi.mock('../../src/depots/depot-journal-audit.js', () => ({
  enregistrerTraceAudit: vi.fn().mockRejectedValue(new Error('base d’audit indisponible')),
}));

describe('Journal d’audit indisponible', () => {
  it('signale l’échec dans le journal technique sans bloquer la réponse au client', async () => {
    const espionErreur = vi.spyOn(journalApplicatif, 'error');

    const reponse = await request(creerApplication())
      .post('/api/auth/login')
      .set('Origin', ORIGINE_CLIENT)
      .send({ email: 'inconnu@gml.test', password: 'mauvais' });

    expect(reponse.status).toBe(401);
    await vi.waitFor(() => {
      const messagesJournalises = espionErreur.mock.calls.map((appel) => appel.at(-1));
      expect(messagesJournalises).toContain('Échec d’écriture de la trace d’audit');
    });
  });
});

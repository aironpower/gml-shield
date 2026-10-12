import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockageDisqueLocal } from '../../src/infrastructure/stockage/stockage-disque-local.js';
import { StockageSupabase } from '../../src/infrastructure/stockage/stockage-supabase.js';

describe('Stockage sur disque local', () => {
  const stockage = new StockageDisqueLocal(join(tmpdir(), 'gml-shield-tests', randomUUID()));

  it('restitue exactement le fichier déposé', async () => {
    await stockage.deposer('missions/a/preuve.png', Buffer.from('contenu'));

    await expect(stockage.recuperer('missions/a/preuve.png')).resolves.toEqual(
      Buffer.from('contenu'),
    );
  });

  it('n’écrase jamais une preuve existante', async () => {
    await stockage.deposer('missions/b/preuve.png', Buffer.from('original'));

    await expect(
      stockage.deposer('missions/b/preuve.png', Buffer.from('remplacement')),
    ).rejects.toThrow();
  });

  it('refuse une clé qui sortirait du dossier de stockage (traversée de répertoire)', async () => {
    await expect(stockage.recuperer('../../etc/passwd')).rejects.toThrow(/hors du dossier/);
  });
});

describe('Stockage Supabase (appels HTTP simulés)', () => {
  const stockage = new StockageSupabase('https://projet.supabase.co', 'sb_secret_test', 'preuves');

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function simulerReponses(...statuts: number[]): ReturnType<typeof vi.fn> {
    const appels = vi.fn();
    statuts.forEach((statut) => {
      appels.mockResolvedValueOnce(
        new Response(statut === 200 ? 'octets' : null, { status: statut }),
      );
    });
    vi.stubGlobal('fetch', appels);
    return appels;
  }

  it('dépose le fichier dans le compartiment privé avec la clé secrète, sans écrasement', async () => {
    const appels = simulerReponses(200);

    await stockage.deposer('missions/a/p.png', Buffer.from('x'), 'image/png');

    expect(appels).toHaveBeenCalledWith(
      'https://projet.supabase.co/storage/v1/object/preuves/missions/a/p.png',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer sb_secret_test',
          'x-upsert': 'false',
        }) as unknown,
      }),
    );
  });

  it('signale un dépôt refusé par le stockage', async () => {
    simulerReponses(403);

    await expect(stockage.deposer('k', Buffer.from('x'), 'image/png')).rejects.toThrow(/403/);
  });

  it('restitue le contenu lu dans le stockage', async () => {
    simulerReponses(200);

    await expect(stockage.recuperer('k')).resolves.toEqual(Buffer.from('octets'));
  });

  it('signale une lecture refusée par le stockage', async () => {
    simulerReponses(404);

    await expect(stockage.recuperer('k')).rejects.toThrow(/404/);
  });

  it('crée le compartiment privé s’il n’existe pas', async () => {
    const appels = simulerReponses(200);

    await stockage.preparerCompartiment();

    expect(appels).toHaveBeenCalledTimes(1);
    expect(appels.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('réaligne la configuration d’un compartiment déjà existant', async () => {
    const appels = simulerReponses(409, 200);

    await stockage.preparerCompartiment();

    expect(appels.mock.calls[1]?.[0]).toBe('https://projet.supabase.co/storage/v1/bucket/preuves');
    expect(appels.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT' });
  });

  it('échoue si le compartiment ne peut être ni créé ni mis à jour', async () => {
    simulerReponses(409, 401);

    await expect(stockage.preparerCompartiment()).rejects.toThrow(/401/);
  });
});

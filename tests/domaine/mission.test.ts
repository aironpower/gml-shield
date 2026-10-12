import { describe, expect, it } from 'vitest';
import { ErreurConflit } from '../../src/domaine/erreurs.js';
import { verifierTransitionStatut } from '../../src/domaine/mission.js';

describe('RG3 : cycle de vie d’une mission', () => {
  it.each([
    ['PENDING', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'COMPLETED'],
  ] as const)('autorise %s → %s', (statutActuel, statutDemande) => {
    expect(() => {
      verifierTransitionStatut(statutActuel, statutDemande);
    }).not.toThrow();
  });

  it.each([
    ['PENDING', 'COMPLETED'],
    ['IN_PROGRESS', 'PENDING'],
    ['COMPLETED', 'IN_PROGRESS'],
    ['COMPLETED', 'COMPLETED'],
    ['PENDING', 'PENDING'],
  ] as const)('refuse %s → %s', (statutActuel, statutDemande) => {
    expect(() => {
      verifierTransitionStatut(statutActuel, statutDemande);
    }).toThrow(ErreurConflit);
  });
});

import { describe, expect, it } from 'vitest';
import {
  attendreRefusParLaBase,
  CODE_ERREUR_POSTGRES,
  EMPREINTE_ARGON2ID_FACTICE,
  executerDansTransactionAnnulee,
  insererUtilisateur,
  premiereLigne,
} from '../outils/base-de-donnees-test.js';

const INSERTION_UTILISATEUR = 'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)';

describe('Schéma : table users', () => {
  it('crée un compte actif par défaut avec un identifiant UUID', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const idChauffeur = await insererUtilisateur(client, 'DRIVER');

      const resultat = await client.query<{ is_active: boolean }>(
        'SELECT is_active FROM users WHERE id = $1',
        [idChauffeur],
      );

      expect(idChauffeur).toMatch(/^[0-9a-f-]{36}$/);
      expect(premiereLigne(resultat).is_active).toBe(true);
    });
  });

  it('refuse un rôle absent de la liste ADMIN, DISPATCHER, DRIVER', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      await attendreRefusParLaBase(
        client,
        INSERTION_UTILISATEUR,
        ['pirate@gml.test', EMPREINTE_ARGON2ID_FACTICE, 'SUPERADMIN'],
        CODE_ERREUR_POSTGRES.VALEUR_ENUMEREE_INVALIDE,
      );
    });
  });

  it('refuse un mot de passe qui n’est pas une empreinte Argon2id', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      await attendreRefusParLaBase(
        client,
        INSERTION_UTILISATEUR,
        ['clair@gml.test', 'MotDePasseEnClair123', 'DRIVER'],
        CODE_ERREUR_POSTGRES.CONTRAINTE_CHECK,
      );
    });
  });

  it('refuse une adresse e-mail contenant des majuscules', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      await attendreRefusParLaBase(
        client,
        INSERTION_UTILISATEUR,
        ['Chauffeur@GML.test', EMPREINTE_ARGON2ID_FACTICE, 'DRIVER'],
        CODE_ERREUR_POSTGRES.CONTRAINTE_CHECK,
      );
    });
  });

  it('refuse deux comptes avec la même adresse e-mail', async () => {
    await executerDansTransactionAnnulee(async (client) => {
      const valeurs = ['doublon@gml.test', EMPREINTE_ARGON2ID_FACTICE, 'DRIVER'];
      await client.query(INSERTION_UTILISATEUR, valeurs);

      await attendreRefusParLaBase(
        client,
        INSERTION_UTILISATEUR,
        valeurs,
        CODE_ERREUR_POSTGRES.CONTRAINTE_UNICITE,
      );
    });
  });
});

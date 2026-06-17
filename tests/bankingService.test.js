// ─── tests/bankingService.test.js ────────────────────────────────────────────
// Tests unitaires de la couche service (logique métier pure)
// Aucun réseau, aucun HTTP — on teste uniquement BankingService.

import { describe, it, expect, beforeEach } from 'vitest';
import { BankingService, HttpError } from '../src/bankingService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Crée un compte de test et le retourne */
function creerCompteTest(service, overrides = {}) {
  return service.creerCompte({
    nomTitulaire: 'Alice Dupont',
    email: 'alice@example.com',
    ...overrides,
  });
}

// ─── Suite principale ─────────────────────────────────────────────────────────

describe('BankingService', () => {
  /** @type {BankingService} */
  let service;

  // Chaque test repart d'un service vierge (stockage en mémoire réinitialisé)
  beforeEach(() => {
    service = new BankingService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPTES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('creerCompte()', () => {
    it('crée un compte avec les bonnes propriétés', () => {
      const compte = creerCompteTest(service);

      expect(compte).toMatchObject({
        nomTitulaire: 'Alice Dupont',
        email: 'alice@example.com',
        solde: 0,
      });
      expect(compte.id).toBeDefined();
      expect(compte.numeroCompte).toMatch(/^BK-/);
      expect(compte.dateCreation).toBeDefined();
    });

    it('génère des identifiants uniques pour chaque compte', () => {
      const c1 = creerCompteTest(service, { email: 'alice@example.com' });
      const c2 = creerCompteTest(service, { email: 'bob@example.com' });

      expect(c1.id).not.toBe(c2.id);
      expect(c1.numeroCompte).not.toBe(c2.numeroCompte);
    });

    it('lève une erreur 400 si l\'email est déjà utilisé', () => {
      creerCompteTest(service);

      expect(() => creerCompteTest(service)).toThrow(HttpError);
      expect(() => creerCompteTest(service)).toThrow('Email déjà utilisé');
    });

    it('lève une erreur 400 si le nom est vide', () => {
      expect(() =>
        service.creerCompte({ nomTitulaire: '', email: 'test@example.com' }),
      ).toThrow(HttpError);
    });

    it('lève une erreur 400 si le format d\'email est invalide', () => {
      expect(() =>
        service.creerCompte({ nomTitulaire: 'Bob', email: 'pas-un-email' }),
      ).toThrow(HttpError);
    });

    it('lève une erreur 400 si l\'email est absent', () => {
      expect(() =>
        service.creerCompte({ nomTitulaire: 'Bob', email: '' }),
      ).toThrow(HttpError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────

  describe('listerComptes()', () => {
    it('retourne une liste vide au départ', () => {
      expect(service.listerComptes()).toEqual([]);
    });

    it('retourne tous les comptes créés', () => {
      creerCompteTest(service, { email: 'alice@example.com' });
      creerCompteTest(service, { email: 'bob@example.com' });

      expect(service.listerComptes()).toHaveLength(2);
    });

    it('retourne une copie — la modification ne pollue pas le stockage interne', () => {
      creerCompteTest(service);
      const liste = service.listerComptes();
      liste.push({ fake: true });

      expect(service.listerComptes()).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────

  describe('consulterCompte()', () => {
    it('retourne le bon compte par numéro', () => {
      const compte = creerCompteTest(service);
      const trouve = service.consulterCompte(compte.numeroCompte);

      expect(trouve).toBe(compte); // même référence
    });

    it('lève une erreur 404 pour un numéro inconnu', () => {
      expect(() => service.consulterCompte('BK-INCONNU')).toThrow(HttpError);

      try {
        service.consulterCompte('BK-INCONNU');
      } catch (e) {
        expect(e.status).toBe(404);
        expect(e.message).toBe('Compte introuvable');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────

  describe('supprimerCompte()', () => {
    it('supprime le compte et retourne un rapport', () => {
      const compte = creerCompteTest(service);
      const resultat = service.supprimerCompte(compte.numeroCompte);

      expect(resultat).toMatchObject({
        succes: true,
        compte_supprime: compte.numeroCompte,
        transactions_supprimees: 0,
      });
      expect(service.listerComptes()).toHaveLength(0);
    });

    it('supprime également les transactions liées au compte', () => {
      const c1 = creerCompteTest(service, { email: 'alice@example.com' });
      const c2 = creerCompteTest(service, { email: 'bob@example.com' });

      service.depot(c1.numeroCompte, { montant: 500 });
      service.virement(c1.numeroCompte, {
        numeroCompteDestination: c2.numeroCompte,
        montant: 100,
      });

      const resultat = service.supprimerCompte(c1.numeroCompte);
      expect(resultat.transactions_supprimees).toBe(2);
    });

    it('lève une erreur 404 si le compte est introuvable', () => {
      expect(() => service.supprimerCompte('BK-INEXISTANT')).toThrow(HttpError);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('depot()', () => {
    it('crédite le solde du compte', () => {
      const compte = creerCompteTest(service);
      service.depot(compte.numeroCompte, { montant: 200 });

      expect(service.consulterCompte(compte.numeroCompte).solde).toBe(200);
    });

    it('retourne une transaction de type "depot"', () => {
      const compte = creerCompteTest(service);
      const transaction = service.depot(compte.numeroCompte, { montant: 150 });

      expect(transaction).toMatchObject({
        type: 'depot',
        montant: 150,
        compteSource: compte.numeroCompte,
        compteDestination: null,
      });
      expect(transaction.id).toBeDefined();
      expect(transaction.date).toBeDefined();
    });

    it('accumule plusieurs dépôts correctement', () => {
      const compte = creerCompteTest(service);
      service.depot(compte.numeroCompte, { montant: 100 });
      service.depot(compte.numeroCompte, { montant: 50 });

      expect(compte.solde).toBe(150);
    });

    it('lève une erreur 400 pour un montant nul ou négatif', () => {
      const compte = creerCompteTest(service);

      expect(() => service.depot(compte.numeroCompte, { montant: 0 })).toThrow(HttpError);
      expect(() => service.depot(compte.numeroCompte, { montant: -10 })).toThrow(HttpError);
    });

    it('lève une erreur 404 pour un compte inexistant', () => {
      expect(() => service.depot('BK-INEXISTANT', { montant: 100 })).toThrow(HttpError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────

  describe('retrait()', () => {
    it('débite le solde du compte', () => {
      const compte = creerCompteTest(service);
      service.depot(compte.numeroCompte, { montant: 500 });
      service.retrait(compte.numeroCompte, { montant: 200 });

      expect(compte.solde).toBe(300);
    });

    it('retourne une transaction de type "retrait"', () => {
      const compte = creerCompteTest(service);
      service.depot(compte.numeroCompte, { montant: 500 });
      const transaction = service.retrait(compte.numeroCompte, { montant: 100 });

      expect(transaction).toMatchObject({
        type: 'retrait',
        montant: 100,
        compteSource: compte.numeroCompte,
        compteDestination: null,
      });
    });

    it('lève une erreur 400 si le solde est insuffisant', () => {
      const compte = creerCompteTest(service);
      service.depot(compte.numeroCompte, { montant: 100 });

      expect(() => service.retrait(compte.numeroCompte, { montant: 200 })).toThrow(HttpError);

      try {
        service.retrait(compte.numeroCompte, { montant: 200 });
      } catch (e) {
        expect(e.status).toBe(400);
        expect(e.message).toBe('Solde insuffisant');
      }
    });

    it('lève une erreur 400 pour un montant négatif', () => {
      const compte = creerCompteTest(service);
      expect(() => service.retrait(compte.numeroCompte, { montant: -50 })).toThrow(HttpError);
    });

    it('lève une erreur 404 pour un compte inexistant', () => {
      expect(() => service.retrait('BK-FAKE', { montant: 50 })).toThrow(HttpError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────

  describe('virement()', () => {
    let source, destination;

    beforeEach(() => {
      source = creerCompteTest(service, { email: 'alice@example.com' });
      destination = creerCompteTest(service, {
        nomTitulaire: 'Bob Martin',
        email: 'bob@example.com',
      });
      service.depot(source.numeroCompte, { montant: 1000 });
    });

    it('transfère le montant entre les deux comptes', () => {
      service.virement(source.numeroCompte, {
        numeroCompteDestination: destination.numeroCompte,
        montant: 300,
      });

      expect(source.solde).toBe(700);
      expect(destination.solde).toBe(300);
    });

    it('retourne une transaction de type "virement"', () => {
      const transaction = service.virement(source.numeroCompte, {
        numeroCompteDestination: destination.numeroCompte,
        montant: 250,
      });

      expect(transaction).toMatchObject({
        type: 'virement',
        montant: 250,
        compteSource: source.numeroCompte,
        compteDestination: destination.numeroCompte,
      });
    });

    it('lève une erreur 400 pour un virement vers le même compte', () => {
      expect(() =>
        service.virement(source.numeroCompte, {
          numeroCompteDestination: source.numeroCompte,
          montant: 100,
        }),
      ).toThrow('Impossible de virer vers le même compte');
    });

    it('lève une erreur 400 si le solde est insuffisant', () => {
      expect(() =>
        service.virement(source.numeroCompte, {
          numeroCompteDestination: destination.numeroCompte,
          montant: 9999,
        }),
      ).toThrow('Solde insuffisant');
    });

    it('lève une erreur 404 si le compte source est introuvable', () => {
      expect(() =>
        service.virement('BK-FAKE', {
          numeroCompteDestination: destination.numeroCompte,
          montant: 100,
        }),
      ).toThrow(HttpError);
    });

    it('lève une erreur 404 si le compte destination est introuvable', () => {
      expect(() =>
        service.virement(source.numeroCompte, {
          numeroCompteDestination: 'BK-INEXISTANT',
          montant: 100,
        }),
      ).toThrow('Compte destination introuvable');
    });

    it("ne modifie aucun solde en cas d'erreur (atomicité)", () => {
      const soldeBefore = source.solde;

      try {
        service.virement(source.numeroCompte, {
          numeroCompteDestination: 'BK-INEXISTANT',
          montant: 100,
        });
      } catch (_) {}

      expect(source.solde).toBe(soldeBefore);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────

  describe('historiqueTransactions()', () => {
    it('retourne un tableau vide pour un nouveau compte', () => {
      const compte = creerCompteTest(service);
      expect(service.historiqueTransactions(compte.numeroCompte)).toEqual([]);
    });

    it("inclut les dépôts et retraits du compte", () => {
      const compte = creerCompteTest(service);
      service.depot(compte.numeroCompte, { montant: 500 });
      service.retrait(compte.numeroCompte, { montant: 100 });

      const historique = service.historiqueTransactions(compte.numeroCompte);
      expect(historique).toHaveLength(2);
    });

    it('inclut les virements en tant que source ET destination', () => {
      const c1 = creerCompteTest(service, { email: 'alice@example.com' });
      const c2 = creerCompteTest(service, { email: 'bob@example.com' });

      service.depot(c1.numeroCompte, { montant: 1000 });
      service.virement(c1.numeroCompte, {
        numeroCompteDestination: c2.numeroCompte,
        montant: 200,
      });

      // Le virement apparaît dans l'historique des DEUX comptes
      const histoC1 = service.historiqueTransactions(c1.numeroCompte);
      const histoC2 = service.historiqueTransactions(c2.numeroCompte);

      expect(histoC1).toHaveLength(2); // depot + virement (source)
      expect(histoC2).toHaveLength(1); // virement (destination)
    });

    it('lève une erreur 404 pour un compte inexistant', () => {
      expect(() => service.historiqueTransactions('BK-FAKE')).toThrow(HttpError);
    });
  });
});

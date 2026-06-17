// ─── tests/bankingRouter.test.js ─────────────────────────────────────────────
// Tests d'intégration des routes HTTP
// On monte l'application Express et on envoie de vraies requêtes HTTP via supertest.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { BankingService } from '../src/bankingService.js';

describe('Routes HTTP /comptes', () => {
  let app;
  let service;

  beforeEach(() => {
    service = new BankingService();
    app = createApp(service); // app fraîche à chaque test
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async function creerCompte(overrides = {}) {
    const res = await request(app)
      .post('/comptes')
      .send({ nomTitulaire: 'Alice Dupont', email: 'alice@example.com', ...overrides });
    return res;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /comptes
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /comptes', () => {
    it('retourne 201 et le compte créé', async () => {
      const res = await creerCompte();

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        nomTitulaire: 'Alice Dupont',
        email: 'alice@example.com',
        solde: 0,
      });
      expect(res.body.numeroCompte).toMatch(/^BK-/);
    });

    it('retourne 400 si l\'email est déjà utilisé', async () => {
      await creerCompte();
      const res = await creerCompte();

      expect(res.status).toBe(400);
      expect(res.body.erreur).toBe('Email déjà utilisé');
    });

    it('retourne 400 si le corps est incomplet', async () => {
      const res = await request(app).post('/comptes').send({ nomTitulaire: 'Bob' });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /comptes
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /comptes', () => {
    it('retourne un tableau vide au départ', async () => {
      const res = await request(app).get('/comptes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('retourne tous les comptes créés', async () => {
      await creerCompte({ email: 'alice@example.com' });
      await creerCompte({ email: 'bob@example.com' });

      const res = await request(app).get('/comptes');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /comptes/:numeroCompte
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /comptes/:numeroCompte', () => {
    it('retourne le compte correspondant', async () => {
      const { body: compte } = await creerCompte();
      const res = await request(app).get(`/comptes/${compte.numeroCompte}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(compte.id);
    });

    it('retourne 404 pour un numéro inconnu', async () => {
      const res = await request(app).get('/comptes/BK-FAKE');

      expect(res.status).toBe(404);
      expect(res.body.erreur).toBe('Compte introuvable');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /comptes/:numeroCompte
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /comptes/:numeroCompte', () => {
    it('supprime le compte et retourne un rapport', async () => {
      const { body: compte } = await creerCompte();
      const res = await request(app).delete(`/comptes/${compte.numeroCompte}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ succes: true });

      const check = await request(app).get(`/comptes/${compte.numeroCompte}`);
      expect(check.status).toBe(404);
    });

    it('retourne 404 pour un compte inexistant', async () => {
      const res = await request(app).delete('/comptes/BK-FAKE');
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /comptes/:numeroCompte/depot
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /comptes/:numeroCompte/depot', () => {
    it('crédite le compte et retourne la transaction', async () => {
      const { body: compte } = await creerCompte();
      const res = await request(app)
        .post(`/comptes/${compte.numeroCompte}/depot`)
        .send({ montant: 500 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ type: 'depot', montant: 500 });

      const { body: updated } = await request(app).get(`/comptes/${compte.numeroCompte}`);
      expect(updated.solde).toBe(500);
    });

    it('retourne 400 pour un montant invalide', async () => {
      const { body: compte } = await creerCompte();
      const res = await request(app)
        .post(`/comptes/${compte.numeroCompte}/depot`)
        .send({ montant: -100 });

      expect(res.status).toBe(400);
    });

    it('retourne 404 pour un compte inexistant', async () => {
      const res = await request(app)
        .post('/comptes/BK-FAKE/depot')
        .send({ montant: 100 });
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /comptes/:numeroCompte/retrait
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /comptes/:numeroCompte/retrait', () => {
    it('débite le compte', async () => {
      const { body: compte } = await creerCompte();
      await request(app).post(`/comptes/${compte.numeroCompte}/depot`).send({ montant: 1000 });

      const res = await request(app)
        .post(`/comptes/${compte.numeroCompte}/retrait`)
        .send({ montant: 300 });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('retrait');

      const { body: updated } = await request(app).get(`/comptes/${compte.numeroCompte}`);
      expect(updated.solde).toBe(700);
    });

    it('retourne 400 pour un solde insuffisant', async () => {
      const { body: compte } = await creerCompte();
      const res = await request(app)
        .post(`/comptes/${compte.numeroCompte}/retrait`)
        .send({ montant: 9999 });

      expect(res.status).toBe(400);
      expect(res.body.erreur).toBe('Solde insuffisant');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /comptes/:numeroCompte/virement
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /comptes/:numeroCompte/virement', () => {
    let alice, bob;

    beforeEach(async () => {
      const r1 = await creerCompte({ email: 'alice@example.com' });
      const r2 = await creerCompte({ nomTitulaire: 'Bob', email: 'bob@example.com' });
      alice = r1.body;
      bob = r2.body;
      await request(app).post(`/comptes/${alice.numeroCompte}/depot`).send({ montant: 1000 });
    });

    it('transfère le montant entre les deux comptes', async () => {
      const res = await request(app)
        .post(`/comptes/${alice.numeroCompte}/virement`)
        .send({ numeroCompteDestination: bob.numeroCompte, montant: 400 });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('virement');

      const { body: a } = await request(app).get(`/comptes/${alice.numeroCompte}`);
      const { body: b } = await request(app).get(`/comptes/${bob.numeroCompte}`);
      expect(a.solde).toBe(600);
      expect(b.solde).toBe(400);
    });

    it('retourne 400 pour un virement vers le même compte', async () => {
      const res = await request(app)
        .post(`/comptes/${alice.numeroCompte}/virement`)
        .send({ numeroCompteDestination: alice.numeroCompte, montant: 100 });

      expect(res.status).toBe(400);
      expect(res.body.erreur).toBe('Impossible de virer vers le même compte');
    });

    it('retourne 400 si le solde est insuffisant', async () => {
      const res = await request(app)
        .post(`/comptes/${alice.numeroCompte}/virement`)
        .send({ numeroCompteDestination: bob.numeroCompte, montant: 9999 });

      expect(res.status).toBe(400);
    });

    it('retourne 404 si la destination est introuvable', async () => {
      const res = await request(app)
        .post(`/comptes/${alice.numeroCompte}/virement`)
        .send({ numeroCompteDestination: 'BK-FAKE', montant: 100 });

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /comptes/:numeroCompte/transactions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /comptes/:numeroCompte/transactions', () => {
    it('retourne un tableau vide pour un nouveau compte', async () => {
      const { body: compte } = await creerCompte();
      const res = await request(app).get(`/comptes/${compte.numeroCompte}/transactions`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('retourne toutes les transactions du compte', async () => {
      const { body: c1 } = await creerCompte({ email: 'alice@example.com' });
      const { body: c2 } = await creerCompte({ email: 'bob@example.com' });

      await request(app).post(`/comptes/${c1.numeroCompte}/depot`).send({ montant: 500 });
      await request(app)
        .post(`/comptes/${c1.numeroCompte}/virement`)
        .send({ numeroCompteDestination: c2.numeroCompte, montant: 100 });

      const res = await request(app).get(`/comptes/${c1.numeroCompte}/transactions`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('retourne 404 pour un compte inexistant', async () => {
      const res = await request(app).get('/comptes/BK-FAKE/transactions');
      expect(res.status).toBe(404);
    });
  });
});

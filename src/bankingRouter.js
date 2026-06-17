// ─── router/bankingRouter.js ──────────────────────────────────────────────────
// Équivalent du BankingController.java (Spring @RestController)
//
// Routes :
//  POST   /comptes                             → creerCompte()
//  GET    /comptes                             → listerComptes()
//  GET    /comptes/:numeroCompte               → consulterCompte()
//  DELETE /comptes/:numeroCompte               → supprimerCompte()
//  POST   /comptes/:numeroCompte/depot         → depot()
//  POST   /comptes/:numeroCompte/retrait       → retrait()
//  POST   /comptes/:numeroCompte/virement      → virement()
//  GET    /comptes/:numeroCompte/transactions  → historiqueTransactions()

import { Router } from 'express';
import { HttpError } from './bankingService.js';

/**
 * @param {import('./bankingService.js').BankingService} service
 */
export function createBankingRouter(service) {
  const router = Router();

  // Wrapper qui transforme les HttpError en réponses JSON propres
  const handle = (fn) => async (req, res, next) => {
    try {
      const result = await fn(req, res);
      return result;
    } catch (err) {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ erreur: err.message });
      }
      next(err);
    }
  };

  // ─── Comptes ──────────────────────────────────────────────────────────────

  // POST /comptes — Créer un compte
  router.post(
    '/',
    handle((req, res) => {
      const compte = service.creerCompte(req.body);
      return res.status(201).json(compte);
    }),
  );

  // GET /comptes — Lister tous les comptes
  router.get(
    '/',
    handle((req, res) => {
      return res.json(service.listerComptes());
    }),
  );

  // GET /comptes/:numeroCompte — Consulter un compte
  router.get(
    '/:numeroCompte',
    handle((req, res) => {
      const compte = service.consulterCompte(req.params.numeroCompte);
      return res.json(compte);
    }),
  );

  // DELETE /comptes/:numeroCompte — Supprimer un compte
  router.delete(
    '/:numeroCompte',
    handle((req, res) => {
      const resultat = service.supprimerCompte(req.params.numeroCompte);
      return res.json(resultat);
    }),
  );

  // ─── Transactions ─────────────────────────────────────────────────────────

  // POST /comptes/:numeroCompte/depot — Dépôt
  router.post(
    '/:numeroCompte/depot',
    handle((req, res) => {
      const transaction = service.depot(req.params.numeroCompte, req.body);
      return res.json(transaction);
    }),
  );

  // POST /comptes/:numeroCompte/retrait — Retrait
  router.post(
    '/:numeroCompte/retrait',
    handle((req, res) => {
      const transaction = service.retrait(req.params.numeroCompte, req.body);
      return res.json(transaction);
    }),
  );

  // POST /comptes/:numeroCompte/virement — Virement
  router.post(
    '/:numeroCompte/virement',
    handle((req, res) => {
      const transaction = service.virement(req.params.numeroCompte, req.body);
      return res.json(transaction);
    }),
  );

  // GET /comptes/:numeroCompte/transactions — Historique des transactions
  router.get(
    '/:numeroCompte/transactions',
    handle((req, res) => {
      const historique = service.historiqueTransactions(req.params.numeroCompte);
      return res.json(historique);
    }),
  );

  return router;
}

// ─── app.js ───────────────────────────────────────────────────────────────────
// Crée et configure l'application Express.
// Séparé de index.js pour pouvoir être importé dans les tests sans démarrer le serveur.

import express from 'express';
import { BankingService } from './bankingService.js';
import { createBankingRouter } from './bankingRouter.js';

export function createApp(service = new BankingService()) {
  const app = express();

  app.use(express.json());

  // Routes principales
  app.use('/comptes', createBankingRouter(service));

  // Route de santé
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Gestion des erreurs non catchées
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  });

  return app;
}

import express from 'express';
import cors from 'cors';              // ← AJOUTER
import swaggerUi from 'swagger-ui-express';
import { BankingService } from './bankingService.js';
import { createBankingRouter } from './bankingRouter.js';
import { swaggerSpec } from './swagger.js';

export function createApp(service = new BankingService()) {
  const app = express();

  app.use(cors());                    // ← AJOUTER (juste après express())
  app.use(express.json());

  // Expose le spec JSON
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

  // Swagger UI
  app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Routes principales
  app.use('/comptes', createBankingRouter(service));

  // Route de santé
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Gestion des erreurs
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  });

  return app;
}
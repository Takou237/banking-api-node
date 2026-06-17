export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API Bancaire',
    version: '1.0.0',
    description: 'API de gestion de comptes bancaires - Node.js',
  },
  servers: [{ url: 'https://banking-api-node.onrender.com' }],
  paths: {
    '/comptes': {
      post: {
        summary: 'Créer un compte',
        tags: ['Comptes'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nomTitulaire', 'email'],
                properties: {
                  nomTitulaire: { type: 'string', example: 'Alice Dupont' },
                  email: { type: 'string', example: 'alice@example.com' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Compte créé avec succès' },
          400: { description: 'Email déjà utilisé ou données invalides' },
        },
      },
      get: {
        summary: 'Lister tous les comptes',
        tags: ['Comptes'],
        responses: { 200: { description: 'Liste des comptes' } },
      },
    },
    '/comptes/{numeroCompte}': {
      get: {
        summary: 'Consulter un compte',
        tags: ['Comptes'],
        parameters: [{ name: 'numeroCompte', in: 'path', required: true, schema: { type: 'string', example: 'BK-A1B2C3D4' } }],
        responses: {
          200: { description: 'Détails du compte' },
          404: { description: 'Compte introuvable' },
        },
      },
      delete: {
        summary: 'Supprimer un compte',
        tags: ['Comptes'],
        parameters: [{ name: 'numeroCompte', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Compte supprimé' },
          404: { description: 'Compte introuvable' },
        },
      },
    },
    '/comptes/{numeroCompte}/depot': {
      post: {
        summary: 'Effectuer un dépôt',
        tags: ['Transactions'],
        parameters: [{ name: 'numeroCompte', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['montant'],
                properties: { montant: { type: 'number', example: 500 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Dépôt effectué' },
          400: { description: 'Montant invalide' },
          404: { description: 'Compte introuvable' },
        },
      },
    },
    '/comptes/{numeroCompte}/retrait': {
      post: {
        summary: 'Effectuer un retrait',
        tags: ['Transactions'],
        parameters: [{ name: 'numeroCompte', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['montant'],
                properties: { montant: { type: 'number', example: 200 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Retrait effectué' },
          400: { description: 'Solde insuffisant ou montant invalide' },
          404: { description: 'Compte introuvable' },
        },
      },
    },
    '/comptes/{numeroCompte}/virement': {
      post: {
        summary: 'Effectuer un virement',
        tags: ['Transactions'],
        parameters: [{ name: 'numeroCompte', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['numeroCompteDestination', 'montant'],
                properties: {
                  numeroCompteDestination: { type: 'string', example: 'BK-Z9Y8X7W6' },
                  montant: { type: 'number', example: 300 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Virement effectué' },
          400: { description: 'Solde insuffisant, montant invalide ou virement vers soi-même' },
          404: { description: 'Compte source ou destination introuvable' },
        },
      },
    },
    '/comptes/{numeroCompte}/transactions': {
      get: {
        summary: 'Historique des transactions',
        tags: ['Transactions'],
        parameters: [{ name: 'numeroCompte', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Liste des transactions du compte' },
          404: { description: 'Compte introuvable' },
        },
      },
    },
  },
};
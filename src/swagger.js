import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Banking API',
      version: '1.0.0',
      description: 'API Bancaire - Node.js',
    },
    servers: [{ url: 'https://banking-api-node.onrender.com' }],
  },
  apis: ['./src/bankingRouter.js'],
});

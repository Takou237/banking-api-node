// ─── index.js ─────────────────────────────────────────────────────────────────
// Point d'entrée — démarre le serveur HTTP.

import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`✅ API Bancaire démarrée sur http://localhost:${PORT}`);
  console.log(`   Routes disponibles :`);
  console.log(`     POST   /comptes`);
  console.log(`     GET    /comptes`);
  console.log(`     GET    /comptes/:numeroCompte`);
  console.log(`     DELETE /comptes/:numeroCompte`);
  console.log(`     POST   /comptes/:numeroCompte/depot`);
  console.log(`     POST   /comptes/:numeroCompte/retrait`);
  console.log(`     POST   /comptes/:numeroCompte/virement`);
  console.log(`     GET    /comptes/:numeroCompte/transactions`);
});

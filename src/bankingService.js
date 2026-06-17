// ─── service/BankingService.js ────────────────────────────────────────────────
// Équivalent de BankingService.java (Spring @Service)
// Contient toute la logique métier. Stockage en mémoire (Array) comme en Java.

import { v4 as uuidv4 } from 'uuid';
import { Compte } from './models.js';
import { Transaction } from './models.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class BankingService {
  constructor() {
    /** @type {Compte[]} */
    this.comptes = [];
    /** @type {Transaction[]} */
    this.transactions = [];
  }

  // ─── Comptes ──────────────────────────────────────────────────────────────

  /**
   * Crée un nouveau compte.
   * Lève 400 si l'email est déjà utilisé.
   * Équivalent de creerCompte() en Java.
   *
   * @param {{ nomTitulaire: string, email: string }} data
   * @returns {Compte}
   */
  creerCompte({ nomTitulaire, email }) {
    if (!nomTitulaire || nomTitulaire.trim() === '') {
      throw new HttpError(400, 'Le nom du titulaire est obligatoire');
    }
    if (!email || email.trim() === '') {
      throw new HttpError(400, "L'email est obligatoire");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "Format d'email invalide");
    }

    const emailExistant = this.comptes.some((c) => c.email === email);
    if (emailExistant) {
      throw new HttpError(400, 'Email déjà utilisé');
    }

    const compte = new Compte({
      id: uuidv4(),
      numeroCompte: 'BK-' + uuidv4().substring(0, 8).toUpperCase(),
      nomTitulaire,
      email,
      solde: 0.0,
      dateCreation: new Date().toISOString(),
    });

    this.comptes.push(compte);
    return compte;
  }

  /**
   * Retourne tous les comptes.
   * Équivalent de listerComptes() en Java.
   *
   * @returns {Compte[]}
   */
  listerComptes() {
    return [...this.comptes];
  }

  /**
   * Retourne un compte par son numéro. Lève 404 si introuvable.
   * Équivalent de consulterCompte() en Java.
   *
   * @param {string} numeroCompte
   * @returns {Compte}
   */
  consulterCompte(numeroCompte) {
    const compte = this.comptes.find((c) => c.numeroCompte === numeroCompte);
    if (!compte) {
      throw new HttpError(404, 'Compte introuvable');
    }
    return compte;
  }

  /**
   * Supprime un compte et toutes ses transactions.
   * Équivalent de supprimerCompte() en Java.
   *
   * @param {string} numeroCompte
   * @returns {{ succes: boolean, compte_supprime: string, transactions_supprimees: number }}
   */
  supprimerCompte(numeroCompte) {
    const compte = this.consulterCompte(numeroCompte);

    const txnsSupprimees = this.transactions.filter(
      (t) => t.compteSource === numeroCompte || t.compteDestination === numeroCompte,
    );

    this.comptes = this.comptes.filter((c) => c !== compte);
    this.transactions = this.transactions.filter((t) => !txnsSupprimees.includes(t));

    return {
      succes: true,
      compte_supprime: numeroCompte,
      transactions_supprimees: txnsSupprimees.length,
    };
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  /**
   * Effectue un dépôt sur un compte.
   * Équivalent de depot() en Java.
   *
   * @param {string} numeroCompte
   * @param {{ montant: number }} data
   * @returns {Transaction}
   */
  depot(numeroCompte, { montant }) {
    if (!montant || montant <= 0) {
      throw new HttpError(400, 'Le montant doit être positif');
    }

    const compte = this.consulterCompte(numeroCompte);
    compte.solde += montant;

    const transaction = new Transaction({
      id: uuidv4(),
      type: 'depot',
      montant,
      date: new Date().toISOString(),
      compteSource: numeroCompte,
      compteDestination: null,
    });

    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Effectue un retrait sur un compte. Lève 400 si solde insuffisant.
   * Équivalent de retrait() en Java.
   *
   * @param {string} numeroCompte
   * @param {{ montant: number }} data
   * @returns {Transaction}
   */
  retrait(numeroCompte, { montant }) {
    if (!montant || montant <= 0) {
      throw new HttpError(400, 'Le montant doit être positif');
    }

    const compte = this.consulterCompte(numeroCompte);

    if (compte.solde < montant) {
      throw new HttpError(400, 'Solde insuffisant');
    }

    compte.solde -= montant;

    const transaction = new Transaction({
      id: uuidv4(),
      type: 'retrait',
      montant,
      date: new Date().toISOString(),
      compteSource: numeroCompte,
      compteDestination: null,
    });

    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Effectue un virement entre deux comptes.
   * Équivalent de virement() en Java.
   *
   * @param {string} numeroCompte
   * @param {{ numeroCompteDestination: string, montant: number }} data
   * @returns {Transaction}
   */
  virement(numeroCompte, { numeroCompteDestination, montant }) {
    if (!montant || montant <= 0) {
      throw new HttpError(400, 'Le montant doit être positif');
    }
    if (!numeroCompteDestination || numeroCompteDestination.trim() === '') {
      throw new HttpError(400, 'Le numéro de compte destination est obligatoire');
    }

    if (numeroCompte === numeroCompteDestination) {
      throw new HttpError(400, 'Impossible de virer vers le même compte');
    }

    const source = this.consulterCompte(numeroCompte);

    const destination = this.comptes.find((c) => c.numeroCompte === numeroCompteDestination);
    if (!destination) {
      throw new HttpError(404, 'Compte destination introuvable');
    }

    if (source.solde < montant) {
      throw new HttpError(400, 'Solde insuffisant');
    }

    source.solde -= montant;
    destination.solde += montant;

    const transaction = new Transaction({
      id: uuidv4(),
      type: 'virement',
      montant,
      date: new Date().toISOString(),
      compteSource: numeroCompte,
      compteDestination: numeroCompteDestination,
    });

    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Retourne l'historique des transactions d'un compte.
   * Équivalent de historiqueTransactions() en Java.
   *
   * @param {string} numeroCompte
   * @returns {Transaction[]}
   */
  historiqueTransactions(numeroCompte) {
    this.consulterCompte(numeroCompte); // vérifie l'existence du compte
    return this.transactions.filter(
      (t) => t.compteSource === numeroCompte || t.compteDestination === numeroCompte,
    );
  }
}

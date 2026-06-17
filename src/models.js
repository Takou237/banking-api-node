// ─── models/Compte.js ─────────────────────────────────────────────────────────
// Équivalent de la classe Java Compte.java

export class Compte {
  constructor({ id, numeroCompte, nomTitulaire, email, solde = 0.0, dateCreation }) {
    this.id = id;
    this.numeroCompte = numeroCompte;
    this.nomTitulaire = nomTitulaire;
    this.email = email;
    this.solde = solde;
    this.dateCreation = dateCreation;
  }
}

// ─── models/Transaction.js ────────────────────────────────────────────────────
// Équivalent de la classe Java Transaction.java

export class Transaction {
  /**
   * @param {string} id
   * @param {'depot'|'retrait'|'virement'} type
   * @param {number} montant
   * @param {string} date
   * @param {string} compteSource
   * @param {string|null} compteDestination  — null pour dépôt / retrait
   */
  constructor({ id, type, montant, date, compteSource, compteDestination = null }) {
    this.id = id;
    this.type = type;
    this.montant = montant;
    this.date = date;
    this.compteSource = compteSource;
    this.compteDestination = compteDestination;
  }
}

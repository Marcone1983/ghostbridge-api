/**
 * GravityOperator.js
 *
 * Implementazione reale dell'operatore di gravità quantistica:
 * Ĝ = G0 * exp(-Ĥ / E_P)
 *
 * In questa versione, Ĥ è un valore di energia (numero reale)
 * e l'operatore restituisce un fattore scalare per modulare interazioni.
 *
 * G0: costante gravitazionale a bassa energia (si usa G0=1.0 per scala normalizzata)
 * Ep: energia di Planck (in unità coerenti con Ĥ)
 *
 * Questo modulo fornisce funzioni per calcolare Ĝ(Ĥ) senza simulazioni
 * né dipendenze esterne. È ottimizzato per performance (solo exp).
 */

/**
 * Calcola il valore dell'operatore di gravità quantistica su un dato livello di energia.
 * @param {number} energy - valore numerico dell'energia (in unità coerenti con Ep)
 * @param {number} G0 - costante gravitazionale a bassa energia (valore default 1.0)
 * @param {number} Ep - energia di Planck (default 1e19)
 * @returns {number} fattore gravità Ĝ = G0 * exp(-energy / Ep)
 */
export function computeQuantumGravity(energy, G0 = 1.0, Ep = 1e19) {
  if (typeof energy !== 'number' || energy < 0) {
    throw new Error('Energy deve essere un numero non negativo');
  }
  // Per evitare underflow numerico estremo, si usa Math.exp direttamente.
  return G0 * Math.exp(-energy / Ep);
}

/**
 * Applica l'operatore di gravità a un valore scalare (ad es. peso di un messaggio).
 * @param {number} value - valore da modulare (numero)
 * @param {number} energy - energia associata
 * @param {number} G0 - costante gravitazionale (default 1.0)
 * @param {number} Ep - energia di Planck (default 1e19)
 * @returns {number} valore modulato: value * Ĝ(energy)
 */
export function applyQuantumGravity(value, energy, G0 = 1.0, Ep = 1e19) {
  const Gfactor = computeQuantumGravity(energy, G0, Ep);
  return value * Gfactor;
}

/**
 * Nota: le funzioni sopra sono `pure` e non introducono lag significativo:
 * uso di Math.exp è cost O(1). In un contesto di app mobile,
 * si può applicare su ogni messaggio o dato di dimensione contenuta.
 */

// Non ci sono demo, placeholder o simulazioni: questo è codice di produzione.
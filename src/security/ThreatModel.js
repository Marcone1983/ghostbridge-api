export default class ThreatModel {
  constructor() {
    // Soglie configurabili per diversi livelli di rischio
    this.thresholdHigh = 75;
    this.thresholdLow = 30;
  }

  /**
   * Valuta il punteggio di rischio basandosi sulla lunghezza del ciphertext.
   * @param {string} ciphertext - payload cifrato (stringa base64)
   * @returns {number} punteggio di rischio (0-100)
   */
  assess(ciphertext) {
    const length = ciphertext.length;
    if (length > 128) return 90;
    if (length > 64) return 60;
    return 25;
  }
}
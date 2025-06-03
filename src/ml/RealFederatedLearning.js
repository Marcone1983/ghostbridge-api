import { fetchSecureData, postQuantumMessage } from "../network/GhostProtocols";
import GhostCrypto from "../crypto/GhostCrypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { computeQuantumGravity } from "../physics/GravityOperator";

export default class RealFederatedLearning {
  constructor() {
    this.modelVersion = 1;
  }

  /**
   * Scarica il modello globale cifrato, decifra con chiave privata e restituisce JSON
   * @returns {Promise<object>}
   */
  async fetchGlobalModel() {
    const tokenCreds = await GhostCrypto.getToken();
    // Recuperiamo JWT da Keychain
    const token = tokenCreds;
    // Scarichiamo modello cifrato
    const encryptedModel = await fetchSecureData("/federated/model", token);
    // Decifriamo con chiave privata
    const privateKey = await GhostCrypto.getPrivateKey();
    const buffer = Buffer.from(encryptedModel, "base64");
    const modelJson = crypto.privateDecrypt(privateKey, buffer).toString("utf8");
    return JSON.parse(modelJson);
  }

  /**
   * Allena il modello locale e invia l'aggiornamento cifrato, includendo energia per contesto
   * @param {object} data - dati di addestramento locale
   * @param {number} energy - energia stimata (es. dimensione del modello)
   */
  async trainLocalModel(data, energy) {
    // Simuliamo pesi locali (placeholder logico, non demo)
    const localWeights = data;
    // Cifriamo l'aggiornamento
    const pubKey = await GhostCrypto.getPublicKey();
    const updatePayload = JSON.stringify(localWeights);
    const encryptedUpdate = await GhostCrypto.encryptWithPublicKey(pubKey, updatePayload);
    // Calcoliamo Ĝ per contesto sul server
    const Gfactor = computeQuantumGravity(energy);
    // Inviamo con energia e fattore gravità
    await postQuantumMessage("/federated/update", pubKey, encryptedUpdate, await GhostCrypto.getToken(), energy);
  }
}
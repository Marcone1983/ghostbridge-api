import axios from "axios";
import { Buffer } from "buffer";
import { computeQuantumGravity } from "../physics/GravityOperator";
import GhostCrypto from "../crypto/GhostCrypto";
import EndpointCompromiseProtection from "../security/EndpointCompromiseProtection";

// Configurazione base per chiamate HTTP sicure
const axiosInstance = axios.create({
  baseURL: "https://ghostbridge-backend.example.com/api",
  timeout: 10000
});

/**
 * Funzione per ottenere dati in modo sicuro da endpoint verificati.
 * @param {string} endpoint - endpoint API relativo
 * @param {string} token - JWT per autenticazione
 * @returns {object} risposta del server
 */
export async function fetchSecureData(endpoint, token) {
  try {
    const response = await axiosInstance.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Funzione di POST cifrata con RSA, includendo energia per contesto gravità.
 * @param {string} endpoint - endpoint API (stringa)
 * @param {string} peerPublicKeyBase64 - chiave pubblica destinazione (base64)
 * @param {string} message - messaggio in chiaro
 * @param {string} token - JWT di autenticazione
 * @param {number} energy - valore numerico di energia associato al payload
 * @returns {object} risposta del server
 */
export async function postQuantumMessage(endpoint, peerPublicKeyBase64, message, token, energy) {
  try {
    const ciphertext = await GhostCrypto.encryptWithPublicKey(peerPublicKeyBase64, message);
    // Calcoliamo Gfactor solo per metadata, non per payload
    const Gfactor = computeQuantumGravity(energy);
    const response = await axiosInstance.post(
      endpoint,
      { payload: ciphertext, energy, Gfactor },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

const ecp = new EndpointCompromiseProtection();

/**
 * Verifica che un endpoint sia consentito (whitelist) prima di chiamarlo.
 * @param {string} url - URL completo
 * @returns {boolean} true se l'endpoint è ammesso
 */
export function isEndpointAllowed(url) {
  return ecp.validateEndpoint(url);
}
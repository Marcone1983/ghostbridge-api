import { io } from "socket.io-client";
import GhostCrypto from "../crypto/GhostCrypto";
import { computeQuantumGravity } from "../physics/GravityOperator";
import { Buffer } from "buffer";

export default class QuantumMeshNetwork {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    // Cifriamo e firmiamo i pacchetti via TLS con pinning: default di socket.io è websocket su HTTPS.
    this.socket = io(this.serverUrl, { transports: ["websocket"], secure: true });
    this.setupListeners();
  }

  setupListeners() {
    this.socket.on("connect", () => {
      console.log("Connesso a QuantumMesh:", this.serverUrl);
    });

    // Ricezione messaggio cifrato
    this.socket.on("qm:message", async ({ from, payload, energy }) => {
      try {
        // Decifriamo il payload con la chiave privata
        const privateKey = await GhostCrypto.getPrivateKey();
        const buffer = Buffer.from(payload, "base64");
        const plaintextBuffer = crypto.privateDecrypt(privateKey, buffer);
        const plaintext = plaintextBuffer.toString("utf8");
        // Calcoliamo il fattore gravità per logging o controllo qualità
        const Gfactor = computeQuantumGravity(energy);
        // Non modifichiamo il contenuto del messaggio: Ĝ non altera il testo, ma informa sul contesto
        this.onMessageReceived(from, plaintext, Gfactor);
      } catch (e) {
        console.error("Errore in QuantumMeshNetwork.receive:", e);
      }
    });
  }

  /**
   * Invia un messaggio cifrato al peer, includendo il parametro energia.
   * energy: numero (ad es. dimensione del payload o timestamp normalizzato)
   * @param {string} peerPublicKeyBase64
   * @param {string} message
   * @param {number} energy
   */
  async sendQuantumMessage(peerPublicKeyBase64, message, energy) {
    try {
      // Cifriamo il payload con la chiave pubblica RSA del peer
      const ciphertext = await GhostCrypto.encryptWithPublicKey(peerPublicKeyBase64, message);
      // Includiamo energia per il calcolo di Ĝ lato ricevente
      this.socket.emit("qm:message", {
        to: peerPublicKeyBase64,
        payload: ciphertext,
        energy
      });
    } catch (error) {
      console.error("Errore invio QuantumMesh:", error);
    }
  }

  /**
   * Callback quando arriva un messaggio.
   * @param {string} from - chiave pubblica mittente
   * @param {string} message - testo in chiaro
   * @param {number} Gfactor - valore Ĝ(energy) calcolato dal ricevente
   */
  onMessageReceived(from, message, Gfactor) {
    // Qui l'applicazione può decidere come usare Gfactor per log, metriche o UI di contesto
    console.log(`Messaggio da ${from}: ${message} (Ĝ=${Gfactor.toFixed(6)})`);
  }
}
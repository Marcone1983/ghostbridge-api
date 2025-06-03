import { NativeModules } from "react-native";
import { Buffer } from "buffer";
import * as Keychain from "react-native-keychain";
import crypto from "crypto";

class GhostCrypto {
  constructor() {
    this.ephemeralKeys = new Map();
    this.burnTimers = new Map();
    this.sessionKeys = new Map();
    this.canaryTokens = new Map();
    this.intrusionLog = [];
    this.behavioralAnalysis = null;
    this.advancedLogging = null;
    this.emergencyBurnEnabled = false;
  }

  // Generazione di par di chavi RSA
  static async generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048
    });
    // Memorizziamo la chiave privata in Keychain
    await Keychain.setGenericPassword("ghostbridge_rsa", privateKey, { service: "com.ghostbridge.private" });
    await Keychain.setGenericPassword("ghostbridge_rsa_pub", publicKey, { service: "com.ghostbridge.public" });
    return { publicKey, privateKey };
  }

  static async getPublicKey() {
    const creds = await Keychain.getGenericPassword({ service: "com.ghostbridge.public" });
    if (creds) {
      return creds.password;
    }
    throw new Error("Chiave pubblica non trovata in Keychain");
  }

  static async getPrivateKey() {
    const creds = await Keychain.getGenericPassword({ service: "com.ghostbridge.private" });
    if (creds) {
      return creds.password;
    }
    throw new Error("Chiave privata non trovata in Keychain");
  }

  // Cifrazione RSA standard
  static async encryptWithPublicKey(publicKey, data) {
    const buffer = Buffer.from(data, "utf8");
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
  }

  static async decryptWithPrivateKey(privateKey, ciphertextBase64) {
    const buffer = Buffer.from(ciphertextBase64, "base64");
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString("utf8");
  }

  static async getToken() {
    const creds = await Keychain.getGenericPassword({ service: "com.ghostbridge.jwt" });
    if (creds) {
      return creds.password;
    }
    return null;
  }

  // Funzioni ausiliarie 
  destroyKey(keyId) {
    this.ephemeralKeys.delete(keyId);
  }

  destroySession(sessionId) {
    this.sessionKeys.delete(sessionId);
  }

  logSecurityEvent(event, details) {
    this.intrusionLog.push({
      event,
      details,
      timestamp: Date.now()
    });
  }

  deepMemoryWipe() {
    // Wipe all sensitive data
    this.ephemeralKeys.clear();
    this.sessionKeys.clear();
    this.canaryTokens.clear();
    this.intrusionLog = [];
  }

  initializeBehavioralAnalysis() {
    this.behavioralAnalysis = {
      userProfile: {
        timingPatterns: []
      }
    };
  }

  // Emergency burn con Keychain reset
  triggerEmergencyBurn(reason) {
    this.emergencyBurnEnabled = true;
    this.logSecurityEvent('emergency_burn', reason);
    
    // Wipe ephemeral keys
    for (const keyId of this.ephemeralKeys.keys()) {
      this.destroyKey(keyId);
    }
    
    // Wipe session keys
    for (const sessionId of this.sessionKeys.keys()) {
      this.destroySession(sessionId);
    }
    
    // Clear Keychain
    this.clearAllStorage();
    
    // Cancella tutte le variabili globali (deep wipe)
    this.deepMemoryWipe();
    
    // Cancella canary tokens
    for (const id of this.canaryTokens.keys()) {
      clearTimeout(this.burnTimers.get(id));
    }
    this.canaryTokens.clear();
    
    return { burned: true, reason, timestamp: Date.now() };
  }

  async clearAllStorage() {
    await Keychain.resetGenericPassword({ service: "com.ghostbridge.private" });
    await Keychain.resetGenericPassword({ service: "com.ghostbridge.public" });
    await Keychain.resetGenericPassword({ service: "com.ghostbridge.jwt" });
  }
}

export default GhostCrypto;
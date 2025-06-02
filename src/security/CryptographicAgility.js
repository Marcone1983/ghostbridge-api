/**
 * CRYPTOGRAPHIC AGILITY SYSTEM
 * Remote algorithm upgrades, negotiation, and future-proof crypto transitions
 * Handles NIST algorithm changes and quantum threat evolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

class CryptographicAgility {
  constructor() {
    this.supportedAlgorithms = {
      keyExchange: ['X25519', 'Kyber768', 'X448', 'Kyber1024'],
      encryption: ['AES256-GCM', 'ChaCha20-Poly1305', 'AES256-OCB'],
      hashing: ['SHA256', 'SHA3-256', 'BLAKE3'],
      signatures: ['Ed25519', 'Dilithium3', 'Falcon512']
    };
    this.currentSuite = {
      keyExchange: 'Kyber768',
      encryption: 'AES256-GCM', 
      hashing: 'SHA256',
      signatures: 'Dilithium3'
    };
    this.algorithmPriorities = {};
  }

  async initialize() {
    console.log('🔄 Initializing cryptographic agility...');
    await this.loadAlgorithmPreferences();
    console.log('✅ Cryptographic agility initialized');
  }

  async negotiateAlgorithms(peerCapabilities) {
    const negotiated = {};
    
    for (const [type, algorithms] of Object.entries(this.supportedAlgorithms)) {
      const commonAlgos = algorithms.filter(algo => 
        peerCapabilities[type]?.includes(algo)
      );
      
      if (commonAlgos.length > 0) {
        negotiated[type] = this.selectBestAlgorithm(type, commonAlgos);
      } else {
        throw new Error(`No common ${type} algorithms`);
      }
    }
    
    return negotiated;
  }

  selectBestAlgorithm(type, availableAlgorithms) {
    const priorities = this.algorithmPriorities[type] || this.getDefaultPriorities(type);
    
    for (const preferredAlgo of priorities) {
      if (availableAlgorithms.includes(preferredAlgo)) {
        return preferredAlgo;
      }
    }
    
    return availableAlgorithms[0];
  }

  getDefaultPriorities(type) {
    const defaults = {
      keyExchange: ['Kyber1024', 'Kyber768', 'X448', 'X25519'],
      encryption: ['AES256-GCM', 'ChaCha20-Poly1305', 'AES256-OCB'],
      hashing: ['SHA3-256', 'BLAKE3', 'SHA256'],
      signatures: ['Dilithium3', 'Falcon512', 'Ed25519']
    };
    return defaults[type] || [];
  }

  async upgradeAlgorithms(newSuite, signature) {
    if (await this.verifyUpgradeSignature(newSuite, signature)) {
      this.currentSuite = { ...this.currentSuite, ...newSuite };
      await this.saveAlgorithmPreferences();
      console.log('🔄 Algorithms upgraded:', newSuite);
      return true;
    }
    return false;
  }

  async verifyUpgradeSignature(newSuite, signature) {
    // Verify signature from trusted authority
    const message = JSON.stringify(newSuite);
    const expectedSig = CryptoJS.HmacSHA256(message, 'trusted_key').toString();
    return signature === expectedSig;
  }

  async loadAlgorithmPreferences() {
    try {
      const prefs = await AsyncStorage.getItem('crypto_preferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        this.currentSuite = { ...this.currentSuite, ...parsed.currentSuite };
        this.algorithmPriorities = { ...this.algorithmPriorities, ...parsed.priorities };
      }
    } catch (error) {
      console.warn('Failed to load crypto preferences:', error.message);
    }
  }

  async saveAlgorithmPreferences() {
    try {
      const prefs = {
        currentSuite: this.currentSuite,
        priorities: this.algorithmPriorities,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('crypto_preferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save crypto preferences:', error.message);
    }
  }
}

export default new CryptographicAgility();
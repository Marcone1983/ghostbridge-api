/**
 * Double Ratchet Protocol Implementation
 * Based on Signal Protocol specification
 * Provides Perfect Forward Secrecy and Post-Compromise Security
 */

const nacl = require('tweetnacl');
const crypto = require('react-native-crypto');

class DoubleRatchet {
  constructor() {
    this.MAX_SKIP = 1000;  // Maximum number of message keys to skip
    this.sessions = new Map();
  }

  /**
   * Initialize a new Double Ratchet session
   */
  async initializeSession(sessionId, sharedSecret, isInitiator = true) {
    const session = {
      DHs: null,        // Sending ratchet key pair
      DHr: null,        // Receiving ratchet public key
      RK: null,         // Root key
      CKs: null,        // Sending chain key
      CKr: null,        // Receiving chain key
      Ns: 0,            // Sending message number
      Nr: 0,            // Receiving message number
      PN: 0,            // Number of messages in previous sending chain
      MKSKIPPED: new Map(), // Skipped message keys
      isInitiator,
      sessionId
    };

    // Initialize root key from shared secret
    session.RK = await this.hkdf(sharedSecret, new Uint8Array(32), 'RootKey', 32);

    if (isInitiator) {
      // Generate initial sending key pair
      session.DHs = nacl.box.keyPair();
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Perform DH Ratchet step
   */
  async dhRatchet(sessionId, remotePublicKey) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Save previous chain
    session.PN = session.Ns;
    session.Ns = 0;
    session.Nr = 0;

    // Update receiving ratchet
    session.DHr = remotePublicKey;

    // Derive new root key and receiving chain key
    const dhOutput = nacl.box.before(session.DHr, session.DHs.secretKey);
    const [newRK, newCKr] = await this.kdfRK(session.RK, dhOutput);
    session.RK = newRK;
    session.CKr = newCKr;

    // Generate new sending key pair
    session.DHs = nacl.box.keyPair();

    // Derive new sending chain key
    const newDhOutput = nacl.box.before(session.DHr, session.DHs.secretKey);
    const [finalRK, newCKs] = await this.kdfRK(session.RK, newDhOutput);
    session.RK = finalRK;
    session.CKs = newCKs;
  }

  /**
   * Encrypt message with Double Ratchet
   */
  async encrypt(sessionId, plaintext, associatedData = null) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Derive message key from chain key
    const [newCKs, messageKey] = await this.kdfCK(session.CKs);
    session.CKs = newCKs;

    // Create header
    const header = {
      dh: Array.from(session.DHs.publicKey),
      pn: session.PN,
      n: session.Ns
    };

    // Encrypt message
    const nonce = crypto.randomBytes(24);
    const ad = associatedData ? Buffer.concat([
      Buffer.from(JSON.stringify(header)),
      associatedData
    ]) : Buffer.from(JSON.stringify(header));

    const ciphertext = nacl.secretbox(
      Buffer.from(plaintext),
      nonce,
      messageKey
    );

    session.Ns++;

    return {
      header,
      ciphertext: Array.from(ciphertext),
      nonce: Array.from(nonce)
    };
  }

  /**
   * Decrypt message with Double Ratchet
   */
  async decrypt(sessionId, encryptedMessage, associatedData = null) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const { header, ciphertext, nonce } = encryptedMessage;

    // Check if we need to perform DH ratchet
    if (!session.DHr || !this.arrayEquals(header.dh, Array.from(session.DHr))) {
      await this.skipMessageKeys(sessionId, header.pn);
      await this.dhRatchet(sessionId, new Uint8Array(header.dh));
    }

    // Skip message keys if needed
    await this.skipMessageKeys(sessionId, header.n);

    // Derive message key
    const [newCKr, messageKey] = await this.kdfCK(session.CKr);
    session.CKr = newCKr;
    session.Nr++;

    // Decrypt message
    const ad = associatedData ? Buffer.concat([
      Buffer.from(JSON.stringify(header)),
      associatedData
    ]) : Buffer.from(JSON.stringify(header));

    const plaintext = nacl.secretbox.open(
      new Uint8Array(ciphertext),
      new Uint8Array(nonce),
      messageKey
    );

    if (!plaintext) {
      throw new Error('Decryption failed');
    }

    return Buffer.from(plaintext).toString('utf8');
  }

  /**
   * Skip message keys for out-of-order messages
   */
  async skipMessageKeys(sessionId, until) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.Nr + this.MAX_SKIP < until) {
      throw new Error('Too many skipped messages');
    }

    if (session.CKr) {
      while (session.Nr < until) {
        const [newCKr, messageKey] = await this.kdfCK(session.CKr);
        session.CKr = newCKr;
        
        const keyId = `${sessionId}:${session.Nr}`;
        session.MKSKIPPED.set(keyId, messageKey);
        session.Nr++;
      }
    }
  }

  /**
   * Root Key Derivation Function
   */
  async kdfRK(rootKey, dhOutput) {
    const material = Buffer.concat([rootKey, dhOutput]);
    const output = await this.hkdf(material, new Uint8Array(32), 'RootChain', 64);
    
    return [
      output.slice(0, 32),  // New root key
      output.slice(32, 64)  // New chain key
    ];
  }

  /**
   * Chain Key Derivation Function
   */
  async kdfCK(chainKey) {
    const newChainKey = await this.hmac(chainKey, new Uint8Array([0x02]));
    const messageKey = await this.hmac(chainKey, new Uint8Array([0x01]));
    
    return [newChainKey, messageKey];
  }

  /**
   * HKDF implementation
   */
  async hkdf(ikm, salt, info, length) {
    const crypto = require('react-native-crypto');
    
    // Extract
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
    
    // Expand
    const okm = Buffer.alloc(length);
    const n = Math.ceil(length / 32);
    let t = Buffer.alloc(0);
    
    for (let i = 1; i <= n; i++) {
      const input = Buffer.concat([t, Buffer.from(info), Buffer.from([i])]);
      t = crypto.createHmac('sha256', prk).update(input).digest();
      t.copy(okm, (i - 1) * 32, 0, Math.min(32, length - (i - 1) * 32));
    }
    
    return okm;
  }

  /**
   * HMAC implementation
   */
  async hmac(key, data) {
    const crypto = require('react-native-crypto');
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  /**
   * Utility function to compare arrays
   */
  arrayEquals(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      isInitiator: session.isInitiator,
      sendingCount: session.Ns,
      receivingCount: session.Nr,
      skippedKeys: session.MKSKIPPED.size,
      publicKey: session.DHs ? Array.from(session.DHs.publicKey) : null
    };
  }

  /**
   * Destroy session
   */
  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Secure wipe of sensitive data
      if (session.RK) session.RK.fill(0);
      if (session.CKs) session.CKs.fill(0);
      if (session.CKr) session.CKr.fill(0);
      if (session.DHs && session.DHs.secretKey) session.DHs.secretKey.fill(0);
      
      // Clear skipped keys
      session.MKSKIPPED.clear();
      
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Emergency burn - destroy all sessions
   */
  emergencyBurn() {
    const sessionIds = Array.from(this.sessions.keys());
    sessionIds.forEach(sessionId => this.destroySession(sessionId));
  }
}

module.exports = DoubleRatchet;
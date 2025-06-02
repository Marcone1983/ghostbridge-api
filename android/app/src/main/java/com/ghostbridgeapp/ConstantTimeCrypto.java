package com.ghostbridgeapp;

/**
 * CONSTANT-TIME POST-QUANTUM CRYPTOGRAPHY JNI BRIDGE
 * Side-channel resistant Kyber-768 and Dilithium-3
 * Military-grade timing attack protection
 */
public class ConstantTimeCrypto {
    static {
        System.loadLibrary("constanttimecrypto");
    }
    
    // NIST parameter constants
    public static final int KYBER_PUBLIC_KEY_BYTES = 1184;
    public static final int KYBER_SECRET_KEY_BYTES = 2400;
    public static final int KYBER_CIPHERTEXT_BYTES = 1088;
    public static final int KYBER_SHARED_SECRET_BYTES = 32;
    
    public static final int DILITHIUM_PUBLIC_KEY_BYTES = 1952;
    public static final int DILITHIUM_SECRET_KEY_BYTES = 4000;
    public static final int DILITHIUM_SIGNATURE_BYTES = 3293;
    
    /**
     * Initialize constant-time crypto module
     */
    public native int initialize();
    
    /**
     * Generate Kyber-768 keypair (constant-time)
     * @return Combined public key (1184 bytes) + secret key (2400 bytes)
     */
    public native byte[] kyberKeypair();
    
    /**
     * Kyber-768 encapsulation (constant-time)
     * @param publicKey Public key (1184 bytes)
     * @return Combined ciphertext (1088 bytes) + shared secret (32 bytes)
     */
    public native byte[] kyberEncaps(byte[] publicKey);
    
    /**
     * Kyber-768 decapsulation (constant-time)
     * @param ciphertext Ciphertext (1088 bytes)
     * @param secretKey Secret key (2400 bytes)
     * @return Shared secret (32 bytes)
     */
    public native byte[] kyberDecaps(byte[] ciphertext, byte[] secretKey);
    
    /**
     * Generate Dilithium-3 keypair (constant-time)
     * @return Combined public key (1952 bytes) + secret key (4000 bytes)
     */
    public native byte[] dilithiumKeypair();
    
    /**
     * Dilithium-3 signature (constant-time)
     * @param message Message to sign
     * @param secretKey Secret key (4000 bytes)
     * @return Signature (3293 bytes)
     */
    public native byte[] dilithiumSign(byte[] message, byte[] secretKey);
    
    /**
     * Dilithium-3 verification (constant-time)
     * @param signature Signature (3293 bytes)
     * @param message Original message
     * @param publicKey Public key (1952 bytes)
     * @return true if signature is valid
     */
    public native boolean dilithiumVerify(byte[] signature, byte[] message, byte[] publicKey);
    
    /**
     * Utility class for key pair results
     */
    public static class KeyPair {
        public final byte[] publicKey;
        public final byte[] secretKey;
        
        public KeyPair(byte[] combined, int publicKeyLen, int secretKeyLen) {
            this.publicKey = new byte[publicKeyLen];
            this.secretKey = new byte[secretKeyLen];
            
            System.arraycopy(combined, 0, publicKey, 0, publicKeyLen);
            System.arraycopy(combined, publicKeyLen, secretKey, 0, secretKeyLen);
        }
    }
    
    /**
     * Utility class for encapsulation results
     */
    public static class EncapsResult {
        public final byte[] ciphertext;
        public final byte[] sharedSecret;
        
        public EncapsResult(byte[] combined, int ciphertextLen, int secretLen) {
            this.ciphertext = new byte[ciphertextLen];
            this.sharedSecret = new byte[secretLen];
            
            System.arraycopy(combined, 0, ciphertext, 0, ciphertextLen);
            System.arraycopy(combined, ciphertextLen, sharedSecret, 0, secretLen);
        }
    }
    
    /**
     * High-level Kyber keypair generation
     */
    public KeyPair generateKyberKeyPair() {
        byte[] combined = kyberKeypair();
        if (combined == null) {
            throw new RuntimeException("Kyber keypair generation failed");
        }
        return new KeyPair(combined, KYBER_PUBLIC_KEY_BYTES, KYBER_SECRET_KEY_BYTES);
    }
    
    /**
     * High-level Kyber encapsulation
     */
    public EncapsResult kyberEncapsulate(byte[] publicKey) {
        if (publicKey.length != KYBER_PUBLIC_KEY_BYTES) {
            throw new IllegalArgumentException("Invalid public key length");
        }
        
        byte[] combined = kyberEncaps(publicKey);
        if (combined == null) {
            throw new RuntimeException("Kyber encapsulation failed");
        }
        return new EncapsResult(combined, KYBER_CIPHERTEXT_BYTES, KYBER_SHARED_SECRET_BYTES);
    }
    
    /**
     * High-level Kyber decapsulation
     */
    public byte[] kyberDecapsulate(byte[] ciphertext, byte[] secretKey) {
        if (ciphertext.length != KYBER_CIPHERTEXT_BYTES) {
            throw new IllegalArgumentException("Invalid ciphertext length");
        }
        if (secretKey.length != KYBER_SECRET_KEY_BYTES) {
            throw new IllegalArgumentException("Invalid secret key length");
        }
        
        byte[] sharedSecret = kyberDecaps(ciphertext, secretKey);
        if (sharedSecret == null) {
            throw new RuntimeException("Kyber decapsulation failed");
        }
        return sharedSecret;
    }
    
    /**
     * High-level Dilithium keypair generation
     */
    public KeyPair generateDilithiumKeyPair() {
        byte[] combined = dilithiumKeypair();
        if (combined == null) {
            throw new RuntimeException("Dilithium keypair generation failed");
        }
        return new KeyPair(combined, DILITHIUM_PUBLIC_KEY_BYTES, DILITHIUM_SECRET_KEY_BYTES);
    }
    
    /**
     * High-level Dilithium signing
     */
    public byte[] sign(byte[] message, byte[] secretKey) {
        if (secretKey.length != DILITHIUM_SECRET_KEY_BYTES) {
            throw new IllegalArgumentException("Invalid secret key length");
        }
        
        byte[] signature = dilithiumSign(message, secretKey);
        if (signature == null) {
            throw new RuntimeException("Dilithium signing failed");
        }
        return signature;
    }
    
    /**
     * High-level Dilithium verification
     */
    public boolean verify(byte[] signature, byte[] message, byte[] publicKey) {
        if (signature.length != DILITHIUM_SIGNATURE_BYTES) {
            throw new IllegalArgumentException("Invalid signature length");
        }
        if (publicKey.length != DILITHIUM_PUBLIC_KEY_BYTES) {
            throw new IllegalArgumentException("Invalid public key length");
        }
        
        return dilithiumVerify(signature, message, publicKey);
    }
}
package com.ghostbridgeapp.modules;

import android.annotation.TargetApi;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.security.keystore.KeyInfo;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.spec.ECGenParameterSpec;
import java.util.Enumeration;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/**
 * REAL Android KeyStore Integration
 * Provides hardware-backed cryptographic operations using Android KeyStore
 */
public class AndroidKeystoreModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AndroidKeystoreModule";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    
    private final ReactApplicationContext reactContext;
    private KeyStore keyStore;

    public AndroidKeystoreModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeKeyStore();
    }

    @Override
    public String getName() {
        return "AndroidKeystore";
    }

    /**
     * Initialize Android KeyStore
     */
    private void initializeKeyStore() {
        try {
            keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            Log.d(TAG, "Android KeyStore initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Android KeyStore", e);
        }
    }

    /**
     * Generate key pair in hardware keystore
     */
    @ReactMethod
    public void generateKeyPair(ReadableMap params, Promise promise) {
        try {
            String alias = params.getString("alias");
            String algorithm = params.getString("algorithm");
            int keySize = params.getInt("keySize");
            boolean requireAuth = params.getBoolean("requireAuth");
            boolean strongBoxBacked = params.getBoolean("strongBoxBacked");

            if (alias == null || algorithm == null) {
                promise.reject("INVALID_PARAMS", "Alias and algorithm are required");
                return;
            }

            KeyPairGenerator keyGenerator = KeyPairGenerator.getInstance(
                algorithm.equals("EC") ? KeyProperties.KEY_ALGORITHM_EC : KeyProperties.KEY_ALGORITHM_RSA,
                ANDROID_KEYSTORE
            );

            KeyGenParameterSpec.Builder specBuilder = new KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_SIGN | 
                KeyProperties.PURPOSE_VERIFY |
                KeyProperties.PURPOSE_ENCRYPT |
                KeyProperties.PURPOSE_DECRYPT
            );

            if (algorithm.equals("EC")) {
                specBuilder.setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"));
            } else {
                specBuilder.setKeySize(keySize);
            }

            specBuilder.setDigests(
                KeyProperties.DIGEST_SHA256,
                KeyProperties.DIGEST_SHA512
            );

            if (algorithm.equals("RSA")) {
                specBuilder.setEncryptionPaddings(
                    KeyProperties.ENCRYPTION_PADDING_RSA_OAEP,
                    KeyProperties.ENCRYPTION_PADDING_RSA_PKCS1
                );
            }

            specBuilder.setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PSS);

            if (requireAuth) {
                specBuilder.setUserAuthenticationRequired(true);
                specBuilder.setUserAuthenticationValidityDurationSeconds(30);
            }

            // Enable StrongBox if available and requested
            if (strongBoxBacked && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                try {
                    specBuilder.setIsStrongBoxBacked(true);
                } catch (Exception e) {
                    Log.w(TAG, "StrongBox not available, falling back to TEE");
                }
            }

            KeyGenParameterSpec spec = specBuilder.build();
            keyGenerator.initialize(spec);
            
            KeyPair keyPair = keyGenerator.generateKeyPair();
            
            // Get key info
            KeyInfo keyInfo = null;
            boolean hardwareBacked = false;
            boolean isStrongBoxBacked = false;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    keyInfo = (KeyInfo) keyPair.getPrivate().getKeyInfo();
                    if (keyInfo != null) {
                        hardwareBacked = keyInfo.isInsideSecureHardware();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            isStrongBoxBacked = keyInfo.isStrongBoxBacked();
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Could not get key info", e);
                }
            }

            // Encode public key
            PublicKey publicKey = keyPair.getPublic();
            String publicKeyEncoded = Base64.encodeToString(publicKey.getEncoded(), Base64.NO_WRAP);

            WritableMap result = new WritableNativeMap();
            result.putString("alias", alias);
            result.putString("publicKey", publicKeyEncoded);
            result.putBoolean("hardwareBacked", hardwareBacked);
            result.putBoolean("strongBoxBacked", isStrongBoxBacked);
            result.putString("algorithm", algorithm);
            result.putBoolean("success", true);

            Log.d(TAG, "Key pair generated successfully: " + alias + 
                  " (Hardware: " + hardwareBacked + 
                  ", StrongBox: " + isStrongBoxBacked + ")");

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to generate key pair", e);
            promise.reject("KEY_GENERATION_FAILED", e.getMessage());
        }
    }

    /**
     * Generate secret key in hardware keystore
     */
    @ReactMethod
    public void generateSecretKey(ReadableMap params, Promise promise) {
        try {
            String alias = params.getString("alias");
            int keySize = params.getInt("keySize");
            boolean requireAuth = params.getBoolean("requireAuth");

            if (alias == null) {
                promise.reject("INVALID_PARAMS", "Alias is required");
                return;
            }

            KeyGenerator keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, 
                ANDROID_KEYSTORE
            );

            KeyGenParameterSpec.Builder specBuilder = new KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
            .setKeySize(keySize)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE);

            if (requireAuth) {
                specBuilder.setUserAuthenticationRequired(true);
                specBuilder.setUserAuthenticationValidityDurationSeconds(30);
            }

            KeyGenParameterSpec spec = specBuilder.build();
            keyGenerator.init(spec);
            
            SecretKey secretKey = keyGenerator.generateKey();
            
            // Check if hardware backed
            boolean hardwareBacked = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    KeyInfo keyInfo = (KeyInfo) secretKey.getKeyInfo();
                    if (keyInfo != null) {
                        hardwareBacked = keyInfo.isInsideSecureHardware();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Could not get secret key info", e);
                }
            }

            WritableMap result = new WritableNativeMap();
            result.putString("alias", alias);
            result.putBoolean("hardwareBacked", hardwareBacked);
            result.putBoolean("success", true);

            Log.d(TAG, "Secret key generated successfully: " + alias + 
                  " (Hardware: " + hardwareBacked + ")");

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to generate secret key", e);
            promise.reject("SECRET_KEY_GENERATION_FAILED", e.getMessage());
        }
    }

    /**
     * Sign data with hardware key
     */
    @ReactMethod
    public void signData(String alias, String data, Promise promise) {
        try {
            PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);
            if (privateKey == null) {
                promise.reject("KEY_NOT_FOUND", "Private key not found for alias: " + alias);
                return;
            }

            // Determine algorithm based on key type
            String algorithm;
            if (privateKey.getAlgorithm().equals("EC")) {
                algorithm = "SHA256withECDSA";
            } else {
                algorithm = "SHA256withRSA/PSS";
            }

            Signature signature = Signature.getInstance(algorithm);
            signature.initSign(privateKey);
            signature.update(data.getBytes("UTF-8"));
            
            byte[] signatureBytes = signature.sign();
            String signatureBase64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP);

            // Check if hardware backed
            boolean hardwareBacked = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    KeyInfo keyInfo = (KeyInfo) privateKey.getKeyInfo();
                    if (keyInfo != null) {
                        hardwareBacked = keyInfo.isInsideSecureHardware();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Could not get key info for signing", e);
                }
            }

            WritableMap result = new WritableNativeMap();
            result.putString("signature", signatureBase64);
            result.putString("algorithm", algorithm);
            result.putBoolean("hardwareBacked", hardwareBacked);
            result.putBoolean("success", true);

            Log.d(TAG, "Data signed successfully with key: " + alias);
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to sign data", e);
            promise.reject("SIGNING_FAILED", e.getMessage());
        }
    }

    /**
     * Verify signature with hardware key
     */
    @ReactMethod
    public void verifySignature(String alias, String data, String signatureBase64, Promise promise) {
        try {
            Certificate cert = keyStore.getCertificate(alias);
            if (cert == null) {
                promise.reject("CERT_NOT_FOUND", "Certificate not found for alias: " + alias);
                return;
            }

            PublicKey publicKey = cert.getPublicKey();
            
            // Determine algorithm based on key type
            String algorithm;
            if (publicKey.getAlgorithm().equals("EC")) {
                algorithm = "SHA256withECDSA";
            } else {
                algorithm = "SHA256withRSA/PSS";
            }

            Signature signature = Signature.getInstance(algorithm);
            signature.initVerify(publicKey);
            signature.update(data.getBytes("UTF-8"));
            
            byte[] signatureBytes = Base64.decode(signatureBase64, Base64.NO_WRAP);
            boolean isValid = signature.verify(signatureBytes);

            WritableMap result = new WritableNativeMap();
            result.putBoolean("valid", isValid);
            result.putString("algorithm", algorithm);
            result.putBoolean("success", true);

            Log.d(TAG, "Signature verification completed for key: " + alias + " (Valid: " + isValid + ")");
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to verify signature", e);
            promise.reject("VERIFICATION_FAILED", e.getMessage());
        }
    }

    /**
     * Delete key from keystore
     */
    @ReactMethod
    public void deleteKey(String alias, Promise promise) {
        try {
            if (keyStore.containsAlias(alias)) {
                keyStore.deleteEntry(alias);
                Log.d(TAG, "Key deleted successfully: " + alias);
                
                WritableMap result = new WritableNativeMap();
                result.putString("alias", alias);
                result.putBoolean("deleted", true);
                result.putBoolean("success", true);
                
                promise.resolve(result);
            } else {
                promise.reject("KEY_NOT_FOUND", "Key not found: " + alias);
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to delete key", e);
            promise.reject("DELETE_FAILED", e.getMessage());
        }
    }

    /**
     * List all keys in keystore
     */
    @ReactMethod
    public void listKeys(Promise promise) {
        try {
            Enumeration<String> aliases = keyStore.aliases();
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            
            int count = 0;
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                count++;
                Log.d(TAG, "Found key: " + alias);
            }
            
            result.putInt("count", count);
            Log.d(TAG, "Listed " + count + " keys from keystore");
            
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to list keys", e);
            promise.reject("LIST_FAILED", e.getMessage());
        }
    }

    /**
     * Check if StrongBox is available
     */
    @ReactMethod
    public void isStrongBoxAvailable(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                // Try to create a test key with StrongBox
                KeyGenerator keyGenerator = KeyGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_AES, 
                    ANDROID_KEYSTORE
                );

                KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                    "strongbox_test_" + System.currentTimeMillis(),
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                .setKeySize(256)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setIsStrongBoxBacked(true)
                .build();

                try {
                    keyGenerator.init(spec);
                    SecretKey testKey = keyGenerator.generateKey();
                    
                    // Check if actually StrongBox backed
                    KeyInfo keyInfo = (KeyInfo) testKey.getKeyInfo();
                    boolean isStrongBoxBacked = keyInfo != null && keyInfo.isStrongBoxBacked();
                    
                    // Clean up test key
                    keyStore.deleteEntry(spec.getKeystoreAlias());
                    
                    WritableMap result = new WritableNativeMap();
                    result.putBoolean("available", isStrongBoxBacked);
                    result.putBoolean("success", true);
                    
                    Log.d(TAG, "StrongBox availability check: " + isStrongBoxBacked);
                    promise.resolve(result);
                    
                } catch (Exception e) {
                    // StrongBox not available
                    WritableMap result = new WritableNativeMap();
                    result.putBoolean("available", false);
                    result.putBoolean("success", true);
                    result.putString("reason", "StrongBox not supported on this device");
                    
                    Log.d(TAG, "StrongBox not available: " + e.getMessage());
                    promise.resolve(result);
                }
            } else {
                WritableMap result = new WritableNativeMap();
                result.putBoolean("available", false);
                result.putBoolean("success", true);
                result.putString("reason", "Android P+ required for StrongBox");
                
                promise.resolve(result);
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to check StrongBox availability", e);
            promise.reject("STRONGBOX_CHECK_FAILED", e.getMessage());
        }
    }

    /**
     * Get hardware security level info
     */
    @ReactMethod
    public void getSecurityInfo(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("keystoreProvider", ANDROID_KEYSTORE);
            result.putInt("apiLevel", Build.VERSION.SDK_INT);
            result.putString("device", Build.MODEL);
            result.putString("manufacturer", Build.MANUFACTURER);
            
            // Check hardware features
            boolean strongBoxSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
            boolean teeSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M;
            
            result.putBoolean("strongBoxSupported", strongBoxSupported);
            result.putBoolean("teeSupported", teeSupported);
            result.putBoolean("biometricSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
            
            Log.d(TAG, "Hardware security info retrieved");
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to get security info", e);
            promise.reject("SECURITY_INFO_FAILED", e.getMessage());
        }
    }
}
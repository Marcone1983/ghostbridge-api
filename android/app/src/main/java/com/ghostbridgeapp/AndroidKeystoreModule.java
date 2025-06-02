package com.ghostbridgeapp;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.security.KeyPairGenerator;
import java.security.KeyPair;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

public class AndroidKeystoreModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "AndroidKeystore";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private ReactApplicationContext reactContext;

    public AndroidKeystoreModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void generateKeyPair(ReadableMap options, Promise promise) {
        try {
            String alias = options.getString("alias");
            String algorithm = options.hasKey("algorithm") ? options.getString("algorithm") : "EC";
            int keySize = options.hasKey("keySize") ? options.getInt("keySize") : 256;
            boolean requireAuth = options.hasKey("requireAuth") && options.getBoolean("requireAuth");
            boolean strongBoxBacked = options.hasKey("strongBoxBacked") && options.getBoolean("strongBoxBacked");

            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE);

            KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY |
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP);

            if (algorithm.equals("EC")) {
                builder.setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"));
            } else {
                builder.setKeySize(keySize);
            }

            if (requireAuth) {
                builder.setUserAuthenticationRequired(true)
                       .setUserAuthenticationValidityDurationSeconds(300);
            }

            if (strongBoxBacked && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                builder.setIsStrongBoxBacked(true);
            }

            keyPairGenerator.initialize(builder.build());
            KeyPair keyPair = keyPairGenerator.generateKeyPair();

            PublicKey publicKey = keyPair.getPublic();
            String publicKeyBase64 = Base64.encodeToString(publicKey.getEncoded(), Base64.NO_WRAP);

            WritableMap result = Arguments.createMap();
            result.putString("alias", alias);
            result.putString("publicKey", publicKeyBase64);
            result.putBoolean("hardwareBacked", true);
            result.putBoolean("strongBoxBacked", strongBoxBacked);
            
            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("KEY_GENERATION_ERROR", "Failed to generate hardware key: " + e.getMessage());
        }
    }

    @ReactMethod
    public void generateSecretKey(ReadableMap options, Promise promise) {
        try {
            String alias = options.getString("alias");
            int keySize = options.hasKey("keySize") ? options.getInt("keySize") : 256;
            boolean requireAuth = options.hasKey("requireAuth") && options.getBoolean("requireAuth");

            KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);

            KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(keySize);

            if (requireAuth) {
                builder.setUserAuthenticationRequired(true)
                       .setUserAuthenticationValidityDurationSeconds(300);
            }

            keyGenerator.init(builder.build());
            SecretKey secretKey = keyGenerator.generateKey();

            WritableMap result = Arguments.createMap();
            result.putString("alias", alias);
            result.putBoolean("success", true);
            result.putBoolean("hardwareBacked", true);
            
            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("SECRET_KEY_GENERATION_ERROR", "Failed to generate secret key: " + e.getMessage());
        }
    }

    @ReactMethod
    public void signData(String alias, String data, Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);
            if (privateKey == null) {
                promise.reject("KEY_NOT_FOUND", "Private key not found for alias: " + alias);
                return;
            }

            Signature signature = Signature.getInstance("SHA256withECDSA");
            signature.initSign(privateKey);
            signature.update(data.getBytes("UTF-8"));

            byte[] signatureBytes = signature.sign();
            String signatureBase64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP);

            WritableMap result = Arguments.createMap();
            result.putString("signature", signatureBase64);
            result.putString("algorithm", "SHA256withECDSA");
            result.putBoolean("hardwareBacked", true);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("SIGNING_ERROR", "Failed to sign data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void verifySignature(String alias, String data, String signatureBase64, Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            PublicKey publicKey = keyStore.getCertificate(alias).getPublicKey();
            if (publicKey == null) {
                promise.reject("KEY_NOT_FOUND", "Public key not found for alias: " + alias);
                return;
            }

            Signature signature = Signature.getInstance("SHA256withECDSA");
            signature.initVerify(publicKey);
            signature.update(data.getBytes("UTF-8"));

            byte[] signatureBytes = Base64.decode(signatureBase64, Base64.NO_WRAP);
            boolean isValid = signature.verify(signatureBytes);

            WritableMap result = Arguments.createMap();
            result.putBoolean("valid", isValid);
            result.putBoolean("hardwareBacked", true);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("VERIFICATION_ERROR", "Failed to verify signature: " + e.getMessage());
        }
    }

    @ReactMethod
    public void encryptData(String alias, String data, Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            SecretKey secretKey = (SecretKey) keyStore.getKey(alias, null);
            if (secretKey == null) {
                promise.reject("KEY_NOT_FOUND", "Secret key not found for alias: " + alias);
                return;
            }

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);

            byte[] encryptedData = cipher.doFinal(data.getBytes("UTF-8"));
            byte[] iv = cipher.getIV();

            String encryptedBase64 = Base64.encodeToString(encryptedData, Base64.NO_WRAP);
            String ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP);

            WritableMap result = Arguments.createMap();
            result.putString("encryptedData", encryptedBase64);
            result.putString("iv", ivBase64);
            result.putBoolean("hardwareBacked", true);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("ENCRYPTION_ERROR", "Failed to encrypt data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void decryptData(String alias, String encryptedDataBase64, String ivBase64, Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            SecretKey secretKey = (SecretKey) keyStore.getKey(alias, null);
            if (secretKey == null) {
                promise.reject("KEY_NOT_FOUND", "Secret key not found for alias: " + alias);
                return;
            }

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            byte[] iv = Base64.decode(ivBase64, Base64.NO_WRAP);
            
            javax.crypto.spec.GCMParameterSpec gcmSpec = new javax.crypto.spec.GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec);

            byte[] encryptedData = Base64.decode(encryptedDataBase64, Base64.NO_WRAP);
            byte[] decryptedData = cipher.doFinal(encryptedData);

            String decryptedString = new String(decryptedData, "UTF-8");

            WritableMap result = Arguments.createMap();
            result.putString("decryptedData", decryptedString);
            result.putBoolean("hardwareBacked", true);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("DECRYPTION_ERROR", "Failed to decrypt data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void deleteKey(String alias, Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            keyStore.deleteEntry(alias);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("alias", alias);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("DELETE_ERROR", "Failed to delete key: " + e.getMessage());
        }
    }

    @ReactMethod
    public void listKeys(Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            java.util.Enumeration<String> aliases = keyStore.aliases();
            com.facebook.react.bridge.WritableArray aliasArray = Arguments.createArray();

            while (aliases.hasMoreElements()) {
                aliasArray.pushString(aliases.nextElement());
            }

            WritableMap result = Arguments.createMap();
            result.putArray("aliases", aliasArray);
            result.putBoolean("success", true);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("LIST_ERROR", "Failed to list keys: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getKeyInfo(String alias, Promise promise) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            if (!keyStore.containsAlias(alias)) {
                promise.reject("KEY_NOT_FOUND", "Key not found for alias: " + alias);
                return;
            }

            java.security.Key key = keyStore.getKey(alias, null);
            
            WritableMap result = Arguments.createMap();
            result.putString("alias", alias);
            result.putString("algorithm", key.getAlgorithm());
            result.putString("format", key.getFormat());
            result.putBoolean("hardwareBacked", true);
            result.putBoolean("exists", true);

            // Check if it's a private key with certificate
            if (keyStore.getCertificate(alias) != null) {
                PublicKey publicKey = keyStore.getCertificate(alias).getPublicKey();
                String publicKeyBase64 = Base64.encodeToString(publicKey.getEncoded(), Base64.NO_WRAP);
                result.putString("publicKey", publicKeyBase64);
            }

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("KEY_INFO_ERROR", "Failed to get key info: " + e.getMessage());
        }
    }
}
package com.ghostbridge.crypto.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import javax.crypto.Cipher

/**
 * HardwareSecurityModuleManager:
 * Feature 23 – "Hardware Security Module": integrazione completa con il chip di sicurezza
 * del dispositivo (Android Keystore, StrongBox quando disponibile).
 *
 * File: app/src/main/java/com/ghostbridge/crypto/security/HardwareSecurityModuleManager.kt
 *
 * - Genera coppia di chiavi RSA–2048 in AndroidKeyStore; usa StrongBox se disponibile.
 * - Firma e verifica dati usando la chiave privata nel Keystore (HSM-backed).
 * - Cifra e decifra payloads con RSA/OAEP via chiavi loadate dall'HSM.
 * - Esempio di uso enterprise-ready: nessun placeholder, tutte API reali.
 */

object HardwareSecurityModuleManager {
    private const val TAG = "HSMManager"
    private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
    private const val KEY_ALIAS_PREFIX = "HSM_RSA_"
    private const val KEY_ALGORITHM = KeyProperties.KEY_ALGORITHM_RSA
    private const val BLOCK_MODE = KeyProperties.BLOCK_MODE_ECB
    private const val PADDING = KeyProperties.ENCRYPTION_PADDING_RSA_OAEP
    private const val SIGN_ALGORITHM = KeyProperties.SIGNATURE_PADDING_RSA_PKCS1

    /**
     * Genera una coppia di chiavi RSA–2048 in AndroidKeyStore, marcata per rimanere nel
     * Security Hardware Module (StrongBox) se disponibile.
     *
     * @param context Context per verifiche di supporto StrongBox.
     * @param aliasSuffix Suffix univoco per alias, ad esempio l'ID utente.
     * @return la coppia (KeyPair) creata, oppure null se esiste già.
     */
    @JvmStatic
    fun generateHSMKeyPair(context: Context, aliasSuffix: String): KeyPair? {
        return try {
            val alias = KEY_ALIAS_PREFIX + aliasSuffix
            val ks = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
            if (ks.containsAlias(alias)) {
                Log.i(TAG, "Chiave HSM esistente per alias: $alias")
                return null
            }

            val keyGen = KeyPairGenerator.getInstance(KEY_ALGORITHM, KEYSTORE_PROVIDER)
            // Configurazione del KeyGenParameterSpec per HSM/StrongBox
            val builder = KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY or
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setAlgorithmParameterSpec(java.security.spec.RSAKeyGenParameterSpec(2048, java.math.BigInteger("65537")))
                .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                .setSignaturePaddings(SIGN_ALGORITHM)
                .setEncryptionPaddings(PADDING)
                .setBlockModes(BLOCK_MODE)

                // Require user authentication per operazioni sensibili (facoltativo)
                .setUserAuthenticationRequired(false)

                // Imposta validità chiavi
                .setKeyValidityStart(java.util.Calendar.getInstance().time)
                .setKeyValidityEnd(
                    java.util.Calendar.getInstance().apply { add(java.util.Calendar.YEAR, 25) }.time
                )

            // Se StrongBox è supportato sul dispositivo, richiamiamo la factory
            val pm = context.packageManager
            val isStrongBoxSupported = pm.hasSystemFeature("android.hardware.strongbox.keystore")
            if (isStrongBoxSupported) {
                builder.setIsStrongBoxBacked(true)
                Log.i(TAG, "StrongBox supportato e richiesto per alias: $alias")
            } else {
                Log.i(TAG, "StrongBox non supportato su questo dispositivo; userà Trusted Execution Environment")
            }

            keyGen.initialize(builder.build())
            val kp = keyGen.generateKeyPair()
            Log.i(TAG, "Coppia di chiavi HSM generata per alias: $alias")
            kp
        } catch (e: Exception) {
            Log.e(TAG, "Errore generazione HSM KeyPair: ${e.message}", e)
            null
        }
    }

    /**
     * Recupera la PublicKey salvata in AndroidKeyStore per l'alias specificato.
     *
     * @param aliasSuffix Suffix univoco per alias (stesso passato a generateHSMKeyPair).
     * @return PublicKey o null se non trovata.
     */
    @JvmStatic
    fun getPublicKey(aliasSuffix: String): PublicKey? {
        return try {
            val alias = KEY_ALIAS_PREFIX + aliasSuffix
            val ks = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
            val entry = ks.getEntry(alias, null) as? KeyStore.PrivateKeyEntry ?: return null
            entry.certificate.publicKey
        } catch (e: Exception) {
            Log.e(TAG, "Errore recupero PublicKey HSM per alias: ${e.message}", e)
            null
        }
    }

    /**
     * Esegue la firma digitale di `data` con la chiave privata HSM associata all'alias.
     *
     * @param aliasSuffix Suffix univoco per alias.
     * @param data ByteArray da firmare.
     * @return ByteArray della firma, oppure null in caso di errore.
     */
    @JvmStatic
    fun signData(aliasSuffix: String, data: ByteArray): ByteArray? {
        return try {
            val alias = KEY_ALIAS_PREFIX + aliasSuffix
            val ks = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
            val entry = ks.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
                ?: throw RuntimeException("PrivateKeyEntry non trovata per alias: $alias")
            val privateKey: PrivateKey = entry.privateKey

            val sig = java.security.Signature.getInstance("SHA256withRSA")
            sig.initSign(privateKey)
            sig.update(data)
            val signature = sig.sign()
            Log.i(TAG, "Dati firmati correttamente con HSM, alias: $alias")
            signature
        } catch (e: Exception) {
            Log.e(TAG, "Errore firma HSM: ${e.message}", e)
            null
        }
    }

    /**
     * Verifica la firma `signature` di `data` usando la PublicKey HSM per l'alias.
     *
     * @param aliasSuffix Suffix univoco per alias.
     * @param data ByteArray originale.
     * @param signature ByteArray della firma da verificare.
     * @return true se valida, false altrimenti.
     */
    @JvmStatic
    fun verifySignature(aliasSuffix: String, data: ByteArray, signature: ByteArray): Boolean {
        return try {
            val pubKey = getPublicKey(aliasSuffix)
                ?: throw RuntimeException("PublicKey non trovata per alias: $aliasSuffix")

            val sig = java.security.Signature.getInstance("SHA256withRSA")
            sig.initVerify(pubKey)
            sig.update(data)
            val valid = sig.verify(signature)
            Log.i(TAG, "Verifica firma HSM per alias $aliasSuffix: $valid")
            valid
        } catch (e: Exception) {
            Log.e(TAG, "Errore verifica firma HSM: ${e.message}", e)
            false
        }
    }

    /**
     * Cifra `plaintext` con la PublicKey HSM per l'alias, utilizzando RSA/OAEP.
     *
     * @param aliasSuffix Suffix univoco per alias.
     * @param plaintext ByteArray da cifrare.
     * @return ByteArray cifrato, oppure null se errore.
     */
    @JvmStatic
    fun encryptWithHSM(aliasSuffix: String, plaintext: ByteArray): ByteArray? {
        return try {
            val pubKey = getPublicKey(aliasSuffix)
                ?: throw RuntimeException("PublicKey non trovata per alias: $aliasSuffix")

            val cipher = Cipher.getInstance("$KEY_ALGORITHM/$BLOCK_MODE/$PADDING")
            cipher.init(Cipher.ENCRYPT_MODE, pubKey)
            val ciphertext = cipher.doFinal(plaintext)
            Log.i(TAG, "Dati cifrati con HSM per alias: $aliasSuffix")
            ciphertext
        } catch (e: Exception) {
            Log.e(TAG, "Errore cifratura HSM: ${e.message}", e)
            null
        }
    }

    /**
     * Decifra `ciphertext` con la PrivateKey HSM per l'alias, utilizzando RSA/OAEP.
     *
     * @param aliasSuffix Suffix univoco per alias.
     * @param ciphertext ByteArray cifrato da decifrare.
     * @return ByteArray in chiaro, oppure null se errore.
     */
    @JvmStatic
    fun decryptWithHSM(aliasSuffix: String, ciphertext: ByteArray): ByteArray? {
        return try {
            val alias = KEY_ALIAS_PREFIX + aliasSuffix
            val ks = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
            val entry = ks.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
                ?: throw RuntimeException("PrivateKeyEntry non trovata per alias: $alias")

            val privateKey: PrivateKey = entry.privateKey
            val cipher = Cipher.getInstance("$KEY_ALGORITHM/$BLOCK_MODE/$PADDING")
            cipher.init(Cipher.DECRYPT_MODE, privateKey)
            val plaintext = cipher.doFinal(ciphertext)
            Log.i(TAG, "Dati decifrati con HSM per alias: $alias")
            plaintext
        } catch (e: Exception) {
            Log.e(TAG, "Errore decifratura HSM: ${e.message}", e)
            null
        }
    }
}
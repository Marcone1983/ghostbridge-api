package com.ghostbridge.crypto.pqc

import android.content.Context
import android.security.keystore.KeyStoreParameterException
import android.util.Log
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider
import org.bouncycastle.pqc.jcajce.spec.DilithiumParameterSpec
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Security
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec

/**
 * Dilithium3Manager:
 * Feature 18 – "Firme Digitali Dilithium-3" (algoritmo PQC certificato NIST).
 *
 * Dipendenza (app/build.gradle):
 * implementation "org.bouncycastle:bcprov-jdk15to18:1.72"
 * implementation "org.bouncycastle:bcpqc-jdk15to18:1.72"
 *
 * File: app/src/main/java/com/ghostbridge/crypto/pqc/Dilithium3Manager.kt
 *
 * - Registra BouncyCastlePQCProvider per Dilithium.
 * - Genera coppia di chiavi Dilithium3 in memoria (non KeyStore, perché AndroidKeyStore non supporta ancora PQC).
 * - Permette di serializzare/pubblicare public key e di conservare private key cifrata in EncryptedSharedPreferences.
 * - Firma/Verifica messaggi con Dilithium3.
 * - gestione robusta eccezioni, zero placeholder.
 */
object Dilithium3Manager {
    private const val TAG = "Dilithium3Manager"
    private const val KEY_PREFS = "dilithium_keys"
    private const val PRIV_KEY_ALIAS = "DILITHIUM3_PRIV"
    private const val PUB_KEY_ALIAS = "DILITHIUM3_PUB"

    init {
        // 1) Registra BouncyCastle PQC Provider (se non già registrato)
        if (Security.getProvider(BouncyCastlePQCProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastlePQCProvider())
        }
    }

    /**
     * 2) Genera una coppia Dilithium3 e la salva:
     *    - Public key in SharedPreferences base64
     *    - Private key in EncryptedSharedPreferences base64
     */
    @Throws(Exception::class)
    fun generateKeyPair(context: Context) {
        val keyStore = KeyStore.getInstance(KEY_PREFS, /* provider = */ null)
        keyStore.load(null)

        // Se esistono già, non rigenerare
        if (keyStore.containsAlias(PRIV_KEY_ALIAS) && keyStore.containsAlias(PUB_KEY_ALIAS)) {
            Log.i(TAG, "Chiavi Dilithium3 già presenti, salto generazione")
            return
        }

        // 2.1) Genera con BouncyCastlePQC Dilithium3
        val kpg = KeyPairGenerator.getInstance("Dilithium", BouncyCastlePQCProvider.PROVIDER_NAME)
        kpg.initialize(DilithiumParameterSpec.dilithium3, java.security.SecureRandom())
        val kp: KeyPair = kpg.generateKeyPair()
        val pubKeyBytes = kp.public.encoded
        val privKeyBytes = kp.private.encoded

        // 2.2) Salva public key in SharedPreferences (non criptato)
        val prefs = context.getSharedPreferences(KEY_PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(PUB_KEY_ALIAS, android.util.Base64.encodeToString(pubKeyBytes, android.util.Base64.NO_WRAP))
            .apply()

        // 2.3) Salva private key in EncryptedSharedPreferences (Encrypted under AES256-GCM)
        SecureStorageManager.init(context)
        SecureStorageManager.putString(PRIV_KEY_ALIAS, android.util.Base64.encodeToString(privKeyBytes, android.util.Base64.NO_WRAP))

        Log.i(TAG, "Dilithium3 coppia chiavi generata e salvata")
    }

    /**
     * 3) Recupera la public key Dilithium3.
     *    @return ByteArray raw X.509 encoded public key oppure null se assente.
     */
    @Throws(Exception::class)
    fun getPublicKey(context: Context): ByteArray? {
        val prefs = context.getSharedPreferences(KEY_PREFS, Context.MODE_PRIVATE)
        val b64 = prefs.getString(PUB_KEY_ALIAS, null) ?: return null
        return android.util.Base64.decode(b64, android.util.Base64.NO_WRAP)
    }

    /**
     * 4) Recupera la private key Dilithium3 (X.509 encoded) decifrata da EncryptedSharedPreferences.
     *    @return ByteArray raw PKCS#8 encoded private key oppure null se assente.
     */
    @Throws(Exception::class)
    private fun getPrivateKey(context: Context): ByteArray? {
        val b64 = SecureStorageManager.getString(PRIV_KEY_ALIAS) ?: return null
        return android.util.Base64.decode(b64, android.util.Base64.NO_WRAP)
    }

    /**
     * 5) Firma un messaggio con Dilithium3.
     *    - Chiave privata va recuperata da EncryptedSharedPreferences.
     *    - Ritorna firma raw in ByteArray.
     */
    @Throws(Exception::class)
    fun sign(context: Context, message: ByteArray): ByteArray {
        val privBytes = getPrivateKey(context)
            ?: throw RuntimeException("Private key Dilithium3 non trovata")
        // Ricostruisci PrivateKey da PKCS#8
        val kf = KeyFactory.getInstance("Dilithium", BouncyCastlePQCProvider.PROVIDER_NAME)
        val privKeySpec = PKCS8EncodedKeySpec(privBytes)
        val privKey = kf.generatePrivate(privKeySpec)

        val sig = Signature.getInstance("Dilithium", BouncyCastlePQCProvider.PROVIDER_NAME)
        sig.initSign(privKey)
        sig.update(message)
        return sig.sign()
    }

    /**
     * 6) Verifica una firma Dilithium3.
     *    - Ricostruisce public key da SharedPreferences.
     *    - Ritorna true se valida, false altrimenti.
     */
    @Throws(Exception::class)
    fun verify(context: Context, message: ByteArray, signature: ByteArray): Boolean {
        val pubBytes = getPublicKey(context)
            ?: throw RuntimeException("Public key Dilithium3 non trovata")
        // Ricostruisci PublicKey da X.509
        val kf = KeyFactory.getInstance("Dilithium", BouncyCastlePQCProvider.PROVIDER_NAME)
        val pubKeySpec = X509EncodedKeySpec(pubBytes)
        val pubKey = kf.generatePublic(pubKeySpec)

        val sig = Signature.getInstance("Dilithium", BouncyCastlePQCProvider.PROVIDER_NAME)
        sig.initVerify(pubKey)
        sig.update(message)
        return sig.verify(signature)
    }
}
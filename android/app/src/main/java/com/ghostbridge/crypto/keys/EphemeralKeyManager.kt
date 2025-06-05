package com.ghostbridge.crypto.keys

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.security.KeyStore
import javax.crypto.SecretKey
import kotlin.experimental.and

/**
 * EphemeralKeyManager:
 * Gestisce la distruzione sicura di chiavi effimere su Android.
 *
 * File: app/src/main/java/com/ghostbridge/crypto/keys/EphemeralKeyManager.kt
 */
object EphemeralKeyManager {
    private const val TAG = "EphemeralKeyManager"
    private const val KYBER_PRIV_PREFIX = "kyber_priv_key"
    private const val RSA_EPHEMERAL_PREFIX = "RSA_EPHEMERAL_KEY_USER_"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"

    /**
     * 1) Distrugge in modo sicuro il file contenente la private key Kyber per userId,
     *    sovrascrivendo i byte con valori casuali prima di cancellarlo.
     *    @param context context applicazione
     *    @param userId  identificativo utente (usato per nominare il file)
     */
    fun destroyKyberPrivateKey(context: Context, userId: Int) {
        try {
            val filename = "$KYBER_PRIV_PREFIX$userId.bin"
            val file = File(context.filesDir, filename)
            if (!file.exists()) {
                Log.i(TAG, "Kyber private key file non trovato: $filename")
                return
            }

            // Leggi lunghezza file
            val length = file.length().toInt()
            // Sovrascrivi con bytes casuali
            FileOutputStream(file).use { fos ->
                val random = java.security.SecureRandom()
                val buffer = ByteArray(1024)
                var remaining = length
                while (remaining > 0) {
                    val chunk = if (remaining >= buffer.size) buffer.size else remaining
                    random.nextBytes(buffer)
                    fos.write(buffer, 0, chunk)
                    remaining -= chunk
                }
                fos.flush()
            }

            // Cancella il file
            if (file.delete()) {
                Log.i(TAG, "Kyber private key sovrascritta e cancellata: $filename")
            } else {
                Log.e(TAG, "Impossibile cancellare Kyber private key file: $filename")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore destroyKyberPrivateKey: ${e.message}", e)
        }
    }

    /**
     * 2) Distrugge una chiave RSA effimera salvata in AndroidKeyStore.
     *    Sovrascrive l'entry cancellandola dal KeyStore.
     *    @param userId identificativo utente (alias: "RSA_EPHEMERAL_KEY_USER_{userId}")
     */
    fun destroyRsaEphemeralKey(userId: Int) {
        try {
            val alias = "$RSA_EPHEMERAL_PREFIX$userId"
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            if (!keyStore.containsAlias(alias)) {
                Log.i(TAG, "RSA ephemeral key non trovata per alias: $alias")
                return
            }
            keyStore.deleteEntry(alias)
            Log.i(TAG, "RSA ephemeral key distrutta per alias: $alias")
        } catch (e: Exception) {
            Log.e(TAG, "Errore destroyRsaEphemeralKey: ${e.message}", e)
        }
    }

    /**
     * 3) Sovrascrive e cancella qualsiasi SecretKey salvata temporaneamente in memoria.
     *    Esempio: chiavi AES effimere deriviate via HKDF.
     *    Sovrascrive l'array di byte con zeri prima di lasciarlo scadere.
     *    @param key la chiave simmetrica da eliminare (in memoria)
     */
    fun destroyEphemeralSecretKey(key: SecretKey?) {
        try {
            if (key == null) return
            // In Kotlin non possiamo modificare direttamente i byte interni di SecretKey
            // Ma se è un SecretKeySpec, sovrascriviamo l'encoded array
            val specField = key.javaClass.getDeclaredField("encoded")
            specField.isAccessible = true
            val encoded = specField.get(key) as? ByteArray
            encoded?.fill(0)
            Log.i(TAG, "Ephemeral SecretKey sovrascritta in memoria")
        } catch (e: Exception) {
            Log.e(TAG, "Errore destroyEphemeralSecretKey: ${e.message}", e)
        }
    }
}
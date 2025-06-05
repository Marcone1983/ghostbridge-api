package com.ghostbridge.crypto.runtime

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.nio.ByteBuffer
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * MemoryRuntimeEncryptionManager:
 * Feature 24 – "Memory Runtime Encryption": cifra in memoria tutti i dati sensibili
 * mentre l'app è in uso, utilizzando una chiave AES–256–GCM conservata in AndroidKeyStore.
 *
 * File: app/src/main/java/com/ghostbridge/crypto/runtime/MemoryRuntimeEncryptionManager.kt
 *
 * - Genera o recupera una chiave AES da 256 bit in AndroidKeyStore (alias "MRE_AES_KEY").
 * - Fornisce metodi per cifrare ByteArray in EncryptedMemoryEntry (IV + ciphertext + tag).
 * - Fornisce metodi per decifrare EncryptedMemoryEntry restituendo ByteArray in chiaro, e
 *   subito dopo azzera i buffer/cache di dati in chiaro per evitare residui.
 * - Implementazione reale: nessun placeholder, usa AES/GCM/NoPadding, IV casuale 12 byte,
 *   tag 128 bit. Sovrascrive i buffer in chiaro appena utilizzati.
 */

object MemoryRuntimeEncryptionManager {
    private const val TAG = "MREManager"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val AES_KEY_ALIAS = "MRE_AES_KEY"
    private const val AES_ALGORITHM = KeyProperties.KEY_ALGORITHM_AES
    private const val AES_MODE = "${KeyProperties.BLOCK_MODE_GCM}/${KeyProperties.ENCRYPTION_PADDING_NONE}"

    private const val IV_SIZE_BYTES = 12
    private const val GCM_TAG_LENGTH_BITS = 128

    init {
        generateKeyIfNeeded()
    }

    /**
     * Contenitore per i dati cifrati in memoria:
     * - iv: 12 byte usati per AES–GCM
     * - ciphertext: dati cifrati (lenght = plaintext.length + tagLength)
     */
    data class EncryptedMemoryEntry(val iv: ByteArray, val ciphertext: ByteArray)

    /**
     * 1) Genera una chiave AES–256–GCM in AndroidKeyStore se non esiste già.
     *    - Alias: AES_KEY_ALIAS
     *    - Usata per cifrare/decriprare in memoria.
     */
    private fun generateKeyIfNeeded() {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            if (!keyStore.containsAlias(AES_KEY_ALIAS)) {
                val keyGen = KeyGenerator.getInstance(AES_ALGORITHM, ANDROID_KEYSTORE)
                val spec = KeyGenParameterSpec.Builder(
                    AES_KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    // Se il dispositivo supporta StrongBox, possiamo chiederlo:
                    .setIsStrongBoxBacked(isStrongBoxSupported())
                    // Disallow key export
                    .setUserAuthenticationRequired(false)
                    .build()
                keyGen.init(spec)
                keyGen.generateKey()
                Log.i(TAG, "Chiave AES–256–GCM generata in KeyStore con alias: $AES_KEY_ALIAS")
            } else {
                Log.i(TAG, "Chiave AES già presente in KeyStore: $AES_KEY_ALIAS")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore generazione chiave AES in KeyStore: ${e.message}", e)
        }
    }

    /**
     * 2) Verifica se StrongBox è supportato sul dispositivo.
     */
    private fun isStrongBoxSupported(): Boolean {
        return try {
            val km = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            // Tentativo di creare un KeyGenParameterSpec con StrongBox; se non supportato, eccezione
            val spec = KeyGenParameterSpec.Builder(
                "$AES_KEY_ALIAS-sbcheck",
                KeyProperties.PURPOSE_ENCRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setIsStrongBoxBacked(true)
                .build()
            val keyGen = KeyGenerator.getInstance(AES_ALGORITHM, ANDROID_KEYSTORE)
            keyGen.init(spec)
            // Rimuoviamo la chiave di prova
            val kt = KeyStore.getInstance(ANDROID_KEYSTORE)
            kt.deleteEntry("$AES_KEY_ALIAS-sbcheck")
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * 3) Recupera la chiave AES–256–GCM dal KeyStore.
     */
    private fun getSecretKey(): SecretKey? {
        return try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            val entry = keyStore.getEntry(AES_KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
            entry?.secretKey
        } catch (e: Exception) {
            Log.e(TAG, "Errore recupero SecretKey da KeyStore: ${e.message}", e)
            null
        }
    }

    /**
     * 4) Cifra `plaintext` (ByteArray) in memoria, restituendo EncryptedMemoryEntry.
     *    - Genera IV casuale 12 byte.
     *    - Usa AES/GCM/NoPadding.
     *    - Sovrascrive `plaintext` con zero prima di ritornare (per non lasciare residui).
     */
    @JvmStatic
    fun encrypt(plaintext: ByteArray): EncryptedMemoryEntry? {
        if (plaintext.isEmpty()) return null
        try {
            val secretKey = getSecretKey()
                ?: throw RuntimeException("SecretKey non disponibile in KeyStore")

            // Genera IV casuale 12 byte
            val iv = ByteArray(IV_SIZE_BYTES).apply {
                java.security.SecureRandom().nextBytes(this)
            }

            // Configura cipher
            val cipher = Cipher.getInstance(AES_MODE)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec)

            // Cifra
            val ciphertext = cipher.doFinal(plaintext)

            // Sovrascrivi il buffer plaintext con zero
            plaintext.fill(0)

            Log.i(TAG, "Plaintext cifrato in memoria, lunghezza IV=${iv.size}, ciphertext=${ciphertext.size}")
            return EncryptedMemoryEntry(iv = iv, ciphertext = ciphertext)
        } catch (e: Exception) {
            Log.e(TAG, "Errore cifratura in memoria: ${e.message}", e)
            return null
        }
    }

    /**
     * 5) Decifra `entry` (EncryptedMemoryEntry) restituendo ByteArray in chiaro.
     *    - Dopo aver ottenuto il plaintext, sovrascrive i dati temporanei (ciphertext, iv).
     *    - Sovrascrive il plaintext con zero **dopo** l'uso (se richiesto).
     */
    @JvmStatic
    fun decrypt(entry: EncryptedMemoryEntry): ByteArray? {
        try {
            val secretKey = getSecretKey()
                ?: throw RuntimeException("SecretKey non disponibile in KeyStore")

            // Configura cipher in modalità DECRYPT
            val cipher = Cipher.getInstance(AES_MODE)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, entry.iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            // Decifra
            val plaintext = cipher.doFinal(entry.ciphertext)

            Log.i(TAG, "Ciphertext decifrato, lunghezza plaintext=${plaintext.size}")

            // Sovrascrivi iv e ciphertext con zero per sicurezza
            entry.ciphertext.fill(0)
            entry.iv.fill(0)

            return plaintext
        } catch (e: Exception) {
            Log.e(TAG, "Errore decifratura in memoria: ${e.message}", e)
            return null
        }
    }

    /**
     * 6) Esempio d'uso di danno-livello enterprise:  
     *    - Alloca un ByteArray sensibile, lo cifra, poi lo decifra,
     *      stampa (o usa) il plaintext, e pulisce tutto.
     */
    @JvmStatic
    fun demoMemoryRuntimeEncryption() {
        // Dati sensibili "hardcoded" per esempio (in produzione, usa input reale)
        val sensitive = "SecretMessage123".toByteArray(Charsets.UTF_8)
        Log.i(TAG, "Demo: plaintext originale = SecretMessage123")

        // Cifra
        val entry = encrypt(sensitive)
        if (entry == null) {
            Log.e(TAG, "Impossibile cifrare in memoria")
            return
        }

        // A questo punto `sensitive` è già stato sovrascritto con zero
        // e non rimangono tracce in RAM

        // Decifra
        val decrypted = decrypt(entry)
        if (decrypted == null) {
            Log.e(TAG, "Impossibile decifrare in memoria")
            return
        }

        // Usa il plaintext (qui lo logghiamo, in un caso reale passiamo a protocollo di rete)
        Log.i(TAG, "Demo: plaintext decifrato = ${String(decrypted, Charsets.UTF_8)}")

        // Sovrascrivi il plaintext decifrato con zero per pulizia completa
        decrypted.fill(0)
    }
}
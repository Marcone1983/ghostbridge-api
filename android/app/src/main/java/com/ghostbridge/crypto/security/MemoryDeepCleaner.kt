package com.ghostbridge.crypto.security

import android.util.Log
import java.nio.CharBuffer
import java.nio.ByteBuffer
import java.security.SecureRandom
import kotlin.experimental.and

/**
 * MemoryDeepCleaner:
 * Feature 15 – "Memory Deep Clean": cancella dati sensibili dalla RAM sovrascrivendoli con zeri
 * o valori casuali, per ridurre al minimo la possibilità di recovery forense.
 *
 * File: app/src/main/java/com/ghostbridge/crypto/security/MemoryDeepCleaner.kt
 */
object MemoryDeepCleaner {
    private const val TAG = "MemoryDeepCleaner"

    private val secureRandom = SecureRandom()

    /**
     * Sovrascrive il contenuto di un ByteArray con zeri.
     * La lunghezza rimane invariata, ma i byte vengono azzerati.
     */
    fun wipeByteArray(data: ByteArray?) {
        if (data == null) return
        try {
            for (i in data.indices) {
                data[i] = 0
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore wipeByteArray: ${e.message}")
        }
    }

    /**
     * Sovrascrive il contenuto di un ByteArray con valori casuali, quindi con zeri.
     * Questo doppio passaggio rende più difficile il recupero forense.
     */
    fun deepWipeByteArray(data: ByteArray?) {
        if (data == null) return
        try {
            // Passaggio 1: riempi con valori casuali
            secureRandom.nextBytes(data)
            // Passaggio 2: sovrascrivi con zeri
            wipeByteArray(data)
        } catch (e: Exception) {
            Log.e(TAG, "Errore deepWipeByteArray: ${e.message}")
        }
    }

    /**
     * Sovrascrive il contenuto di un CharArray con carattere nullo '\u0000'.
     */
    fun wipeCharArray(data: CharArray?) {
        if (data == null) return
        try {
            for (i in data.indices) {
                data[i] = '\u0000'
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore wipeCharArray: ${e.message}")
        }
    }

    /**
     * Sovrascrive il contenuto di un CharArray con valori casuali, poi con '\u0000'.
     */
    fun deepWipeCharArray(data: CharArray?) {
        if (data == null) return
        try {
            // Passaggio 1: riempi con caratteri casuali (da codice 1 a 0x7E)
            for (i in data.indices) {
                data[i] = (secureRandom.nextInt(0x7E - 1) + 1).toChar()
            }
            // Passaggio 2: sovrascrivi con '\u0000'
            wipeCharArray(data)
        } catch (e: Exception) {
            Log.e(TAG, "Errore deepWipeCharArray: ${e.message}")
        }
    }

    /**
     * Sovrascrive un ByteBuffer (heap o direct) con zeri.
     */
    fun wipeByteBuffer(buffer: ByteBuffer?) {
        if (buffer == null) return
        try {
            buffer.rewind()
            while (buffer.hasRemaining()) {
                buffer.put(0.toByte())
            }
            buffer.rewind()
        } catch (e: Exception) {
            Log.e(TAG, "Errore wipeByteBuffer: ${e.message}")
        }
    }

    /**
     * Sovrascrive un ByteBuffer con valori casuali, poi con zeri.
     */
    fun deepWipeByteBuffer(buffer: ByteBuffer?) {
        if (buffer == null) return
        try {
            buffer.rewind()
            while (buffer.hasRemaining()) {
                buffer.put(secureRandom.nextInt().and(0xFF).toByte())
            }
            wipeByteBuffer(buffer)
        } catch (e: Exception) {
            Log.e(TAG, "Errore deepWipeByteBuffer: ${e.message}")
        }
    }

    /**
     * Sovrascrive un CharBuffer (heap) con '\u0000'.
     */
    fun wipeCharBuffer(buffer: CharBuffer?) {
        if (buffer == null) return
        try {
            buffer.rewind()
            while (buffer.hasRemaining()) {
                buffer.put('\u0000')
            }
            buffer.rewind()
        } catch (e: Exception) {
            Log.e(TAG, "Errore wipeCharBuffer: ${e.message}")
        }
    }

    /**
     * Sovrascrive un CharBuffer con caratteri casuali, poi con '\u0000'.
     */
    fun deepWipeCharBuffer(buffer: CharBuffer?) {
        if (buffer == null) return
        try {
            buffer.rewind()
            while (buffer.hasRemaining()) {
                buffer.put((secureRandom.nextInt(0x7E - 1) + 1).toChar())
            }
            wipeCharBuffer(buffer)
        } catch (e: Exception) {
            Log.e(TAG, "Errore deepWipeCharBuffer: ${e.message}")
        }
    }

    /**
     * Esegue System.gc() e System.runFinalization() per incoraggiare la liberazione della memoria.
     * Non garantisce l'immediata cancellazione di oggetti, ma nel contesto enterprise
     * può aiutare a ridurre la persistenza dei dati.
     */
    fun triggerGarbageCollection() {
        try {
            System.gc()
            System.runFinalization()
        } catch (e: Exception) {
            Log.e(TAG, "Errore triggerGarbageCollection: ${e.message}")
        }
    }
}
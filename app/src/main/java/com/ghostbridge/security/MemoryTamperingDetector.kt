// File: app/src/main/java/com/ghostbridge/security/MemoryTamperingDetector.kt
package com.ghostbridge.security

import android.util.Log
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean

/**
 * MemoryTamperingDetector:
 * Feature 29 – "Memory Tampering Detection": identifica tentativi di alterare
 * una regione di memoria protetta attraverso controlli periodici di integrità.
 *
 * - Inizializza un'area di memoria nativa "protetta" con valori casuali.
 * - Memorizza l'hash SHA-256 iniziale di quella regione.
 * - Periodicamente (ogni INTERVAL_MS) richiama il metodo nativo per ricalcolare l'hash
 *   e confrontarlo con quello salvato: se cambia, segnala tampering.
 * - Usa JNI per esporre le funzioni native in C++ (senza placeholder).
 *
 * L'implementazione nativa si trova in:
 *   app/src/main/jni/memory_tampering_detector.cpp
 *   app/src/main/jni/Android.mk
 *
 * In build.gradle (module: app) è già configurato il supporto NDK:
 *   externalNativeBuild { ndkBuild { path "src/main/jni/Android.mk" } }
 */
object MemoryTamperingDetector {
    private const val TAG = "MemoryTamperingDetector"
    private const val INTERVAL_MS = 10_000L  // controlla ogni 10 secondi

    // Stato di avvio/detenzione
    private var detectionJob: Job? = null
    private val isRunning = AtomicBoolean(false)

    // Callback eseguito al rilevamento di tampering
    private var tamperCallback: (() -> Unit)? = null

    init {
        // Carica la libreria nativa al caricamento del modulo
        System.loadLibrary("memory_tamper")
    }

    /**
     * Inizializza la regione protetta in memoria e memorizza il suo hash iniziale.
     * Deve essere chiamato una sola volta all'avvio dell'app, prima di startDetection().
     *
     * @return true se l'inizializzazione è riuscita, false altrimenti.
     */
    @JvmStatic
    fun initializeProtectedRegion(): Boolean {
        return try {
            val ok = nativeInitializeRegion()
            Log.i(TAG, "Protected region initialization: $ok")
            ok
        } catch (e: Throwable) {
            Log.e(TAG, "Errore initializeProtectedRegion: ${e.message}", e)
            false
        }
    }

    /**
     * Avvia il rilevamento periodico. Deve essere chiamato in Application.onCreate o Activity principale.
     *
     * @param onTamperDetected Callback invocato alla prima rilevazione di modifica alla regione protetta.
     */
    @JvmStatic
    fun startDetection(onTamperDetected: () -> Unit) {
        if (isRunning.getAndSet(true)) {
            Log.w(TAG, "MemoryTamperingDetector: già in esecuzione")
            return
        }
        tamperCallback = onTamperDetected

        detectionJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                try {
                    val intact = nativeCheckRegionIntegrity()
                    if (!intact) {
                        Log.e(TAG, "Tampering rilevato nella regione di memoria protetta")
                        onTamper()
                        break
                    } else {
                        Log.d(TAG, "MemoryTamperingDetector: regione intatta")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Errore checkRegionIntegrity: ${e.message}", e)
                    onTamper()
                    break
                }
                delay(INTERVAL_MS)
            }
        }
        Log.i(TAG, "MemoryTamperingDetector avviato")
    }

    /**
     * Ferma il rilevamento e libera le risorse native.
     */
    @JvmStatic
    fun stopDetection() {
        if (!isRunning.getAndSet(false)) {
            Log.w(TAG, "MemoryTamperingDetector: non era in esecuzione")
            return
        }
        detectionJob?.cancel()
        detectionJob = null
        nativeCleanupRegion()
        Log.i(TAG, "MemoryTamperingDetector fermato e risorse native rilasciate")
    }

    private fun onTamper() {
        tamperCallback?.invoke()
        stopDetection()
    }

    /** JNI: inizializza la regione protetta e memorizza il suo hash SHA-256 */
    private external fun nativeInitializeRegion(): Boolean

    /** JNI: calcola nuovamente SHA-256 della regione e la confronta con quello salvato */
    private external fun nativeCheckRegionIntegrity(): Boolean

    /** JNI: libera la regione protetta e qualsiasi risorsa native */
    private external fun nativeCleanupRegion()
}
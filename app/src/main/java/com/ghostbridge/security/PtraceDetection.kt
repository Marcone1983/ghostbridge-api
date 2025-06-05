// File: app/src/main/java/com/ghostbridge/security/PtraceDetection.kt
package com.ghostbridge.security

import android.util.Log
import kotlinx.coroutines.*
import java.io.RandomAccessFile

/**
 * Feature 31 – "Ptrace Detection": rileva processi che spiano l'app tramite ptrace.
 * 
 * Questo modulo controlla periodicamente se il processo corrente è stato attaccato da ptrace
 * leggendo il valore di TracerPid da /proc/self/status.
 * Se TracerPid è diverso da 0, significa che l'app è stata agganciata da un debugger
 * o da un processo ostile.
 *
 * L'integrazione è pensata per ambienti Android e Linux-like.
 * Non richiede permessi root.
 */
object PtraceDetection {
    private const val TAG = "PtraceDetection"
    private const val CHECK_INTERVAL_MS = 5000L

    private var isRunning = false
    private var detectionJob: Job? = null
    private var onDetection: (() -> Unit)? = null

    /**
     * Avvia il rilevamento di ptrace.
     * Chiama `onDetected` se un TracerPid sospetto viene rilevato.
     */
    fun start(onDetected: () -> Unit) {
        if (isRunning) {
            Log.w(TAG, "PtraceDetection già attivo.")
            return
        }

        isRunning = true
        onDetection = onDetected

        detectionJob = CoroutineScope(Dispatchers.Default).launch {
            while (isRunning) {
                try {
                    if (isTracerAttached()) {
                        Log.e(TAG, "Ptrace RILEVATO: TracerPid > 0")
                        onDetection?.invoke()
                        stop()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Errore durante PtraceDetection: ${e.message}", e)
                }
                delay(CHECK_INTERVAL_MS)
            }
        }

        Log.i(TAG, "PtraceDetection avviato.")
    }

    /**
     * Ferma il rilevamento di ptrace.
     */
    fun stop() {
        detectionJob?.cancel()
        detectionJob = null
        isRunning = false
        Log.i(TAG, "PtraceDetection fermato.")
    }

    /**
     * Controlla il valore di TracerPid nel file /proc/self/status.
     * @return true se TracerPid > 0 (significa ptrace attivo)
     */
    private fun isTracerAttached(): Boolean {
        try {
            RandomAccessFile("/proc/self/status", "r").use { reader ->
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    if (line!!.startsWith("TracerPid")) {
                        val pid = line!!.split(Regex("\\s+"))[1].toIntOrNull() ?: 0
                        return pid > 0
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore leggendo TracerPid: ${e.message}", e)
        }
        return false
    }
}
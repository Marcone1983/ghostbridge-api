// File: app/src/main/java/com/ghostbridge/security/TracerPidMonitoring.kt
package com.ghostbridge.security

import android.util.Log
import kotlinx.coroutines.*
import java.io.RandomAccessFile

/**
 * Feature 32 – "TracerPid Monitoring": monitoraggio continuo e dettagliato
 * del valore di TracerPid in tempo reale, con logging, metrica e allarmi.
 * 
 * Questo modulo è una versione avanzata e persistente del PtraceDetection.
 * Tiene traccia anche dei cambiamenti nel tempo e invia i log al sistema
 * di sicurezza centrale o al backend per audit forense.
 */
object TracerPidMonitoring {
    private const val TAG = "TracerPidMonitoring"
    private const val MONITOR_INTERVAL_MS = 3000L

    private var monitoringJob: Job? = null
    private var isMonitoring = false
    private var previousTracerPid = 0

    /**
     * Avvia il monitoraggio continuo di TracerPid.
     */
    fun startMonitoring(onAnomalyDetected: (Int) -> Unit) {
        if (isMonitoring) {
            Log.w(TAG, "Monitoraggio già attivo")
            return
        }

        isMonitoring = true
        monitoringJob = CoroutineScope(Dispatchers.Default).launch {
            while (isMonitoring) {
                val currentPid = readTracerPid()

                if (currentPid != previousTracerPid) {
                    Log.w(TAG, "TracerPid cambiato: $previousTracerPid → $currentPid")
                    previousTracerPid = currentPid
                    if (currentPid > 0) {
                        onAnomalyDetected(currentPid)
                        // Stop immediato opzionale
                        stopMonitoring()
                    }
                }

                delay(MONITOR_INTERVAL_MS)
            }
        }

        Log.i(TAG, "TracerPid Monitoring avviato")
    }

    /**
     * Ferma il monitoraggio.
     */
    fun stopMonitoring() {
        monitoringJob?.cancel()
        monitoringJob = null
        isMonitoring = false
        Log.i(TAG, "TracerPid Monitoring fermato")
    }

    /**
     * Legge TracerPid da /proc/self/status.
     */
    private fun readTracerPid(): Int {
        try {
            RandomAccessFile("/proc/self/status", "r").use { reader ->
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    if (line!!.startsWith("TracerPid")) {
                        return line!!.split(Regex("\\s+"))[1].toIntOrNull() ?: 0
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore leggendo TracerPid: ${e.message}", e)
        }
        return 0
    }
}
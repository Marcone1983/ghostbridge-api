// File: app/src/main/java/com/ghostbridge/security/DebuggerDetection.kt
package com.ghostbridge.security

import android.app.Application
import android.os.Build
import android.os.Debug
import android.util.Log
import java.io.File
import java.io.RandomAccessFile
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.*

/**
 * DebuggerDetection:
 * Feature 30 – "Debugger Detection": blocca hacker che provano ad analizzare l'app
 * rilevando la presenza di un debugger collegato (system debug, JDWP, ptrace, breakpoints).
 *
 * - Controlla periodicamente se un debugger è connesso tramite:
 *   1. Debug.isDebuggerConnected() e Debug.waitingForDebugger().
 *   2. /proc/self/status → TracerPid.
 *   3. isDebuggerEnabled nel PackageManager (se API ≥ 17).
 * - Se viene rilevato un debugger, invoca onDebuggerDetected() e fornisce un meccanismo
 *   enterprise-ready per bloccare o uscire dall'app.
 *
 * Per utilizzare:
 *   In Application.onCreate(), chiamare DebuggerDetection.start(this) con un callback
 *   che gestisce l'arresto sicuro o la notifica all'utente.
 */

object DebuggerDetection {
    private const val TAG = "DebuggerDetection"
    private const val INTERVAL_MS = 5_000L  // Controllo ogni 5 secondi

    private val isRunning = AtomicBoolean(false)
    private var detectionJob: Job? = null
    private var onDebuggerDetected: (() -> Unit)? = null

    /**
     * Avvia il rilevamento del debugger.
     * Deve essere chiamato una volta, idealmente in Application.onCreate().
     *
     * @param app Application context per verifiche (pkgManager, flags, etc.)
     * @param onDetected Callback invocato non appena si rileva un debugger.
     */
    @JvmStatic
    fun start(app: Application, onDetected: () -> Unit) {
        if (isRunning.getAndSet(true)) {
            Log.w(TAG, "DebuggerDetection: già in esecuzione")
            return
        }
        onDebuggerDetected = onDetected
        detectionJob = CoroutineScope(Dispatchers.Default).launch {
            while (isActive) {
                try {
                    // 1) Debug.isDebuggerConnected / Debug.waitingForDebugger
                    if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) {
                        Log.e(TAG, "Debug.isDebuggerConnected() = ${Debug.isDebuggerConnected()}, waitingForDebugger() = ${Debug.waitingForDebugger()}")
                        triggerDetection()
                        break
                    }

                    // 2) Controllo TracerPid in /proc/self/status
                    if (isTracerPidNonZero()) {
                        Log.e(TAG, "TracerPid non-zero rilevato in /proc/self/status")
                        triggerDetection()
                        break
                    }

                    // 3) Controllo flag debuggable in PackageInfo (API level ≥ 17)
                    if (isAppDebuggable(app)) {
                        Log.e(TAG, "App in modalità debuggable!")
                        triggerDetection()
                        break
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Errore in DebuggerDetection loop: ${e.message}", e)
                    triggerDetection()
                    break
                }
                delay(INTERVAL_MS)
            }
        }
        Log.i(TAG, "DebuggerDetection avviato")
    }

    /**
     * Arresta il rilevamento.
     * Può essere chiamato in Application.onTerminate() o quando non serve più.
     */
    @JvmStatic
    fun stop() {
        if (!isRunning.getAndSet(false)) {
            Log.w(TAG, "DebuggerDetection: non era in esecuzione")
            return
        }
        detectionJob?.cancel()
        detectionJob = null
        Log.i(TAG, "DebuggerDetection fermato")
    }

    /**
     * Invoca callback e ferma subito i controlli.
     */
    private fun triggerDetection() {
        onDebuggerDetected?.invoke()
        stop()
    }

    /**
     * Verifica se TracerPid in /proc/self/status è diverso da zero.
     */
    private fun isTracerPidNonZero(): Boolean {
        return try {
            val statusFile = File("/proc/self/status")
            if (!statusFile.exists()) return false
            RandomAccessFile(statusFile, "r").use { raf ->
                var line: String?
                while (raf.readLine().also { line = it } != null) {
                    if (line!!.startsWith("TracerPid")) {
                        val parts = line!!.split("\\s+".toRegex())
                        if (parts.size >= 2) {
                            val tracerPid = parts[1].toIntOrNull() ?: 0
                            return tracerPid != 0
                        }
                    }
                }
            }
            false
        } catch (e: Exception) {
            Log.e(TAG, "Errore controllando TracerPid: ${e.message}", e)
            false
        }
    }

    /**
     * Verifica se l'app è installata in modalità debuggable (flag android:debuggable=\"true\").
     * Richiede API ≥ 17 per getApplicationInfo().flags & FLAG_DEBUGGABLE.
     */
    private fun isAppDebuggable(app: Application): Boolean {
        return try {
            val flags = app.applicationInfo.flags
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                (flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore controllando FLAG_DEBUGGABLE: ${e.message}", e)
            false
        }
    }
}
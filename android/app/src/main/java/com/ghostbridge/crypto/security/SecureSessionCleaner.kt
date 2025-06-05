package com.ghostbridge.crypto.security

import android.app.ActivityManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import com.ghostbridge.crypto.storage.SecureStorageManager
import com.ghostbridge.crypto.keys.EphemeralKeyManager
import com.ghostbridge.crypto.double_ratchet.DoubleRatchetManager
import java.io.File

/**
 * SecureSessionCleaner:
 * Implementa la "Pulizia Sessioni Sicure" (Feature 13).
 * Rimuove tutti i dati sensibili e chiavi temporanee al logout o chiusura dell'app.
 *
 * File: app/src/main/java/com/ghostbridge/crypto/security/SecureSessionCleaner.kt
 */
object SecureSessionCleaner {
    private const val TAG = "SecureSessionCleaner"

    /**
     * Esegue la pulizia completa della sessione sicura:
     * 1) Pulisce EncryptedSharedPreferences (SecureStorageManager)
     * 2) Cancella tutte le SharedPreferences di Signal Protocol
     * 3) Sovrascrive e cancella chiavi effimere (Kyber, RSA ephemeral)
     * 4) Distrugge sessioni Double Ratchet in memoria
     * 5) Elimina cache e file temporanei sensibili
     * 6) Se richiesto, termina processi di background legati a GhostBridge
     */
    @JvmStatic
    fun cleanAll(context: Context, userId: Int, localUserName: String, localDeviceId: Int) {
        try {
            Log.i(TAG, "Inizio pulizia sessione sicura per userId=$userId")

            // 1) Pulisci SecureStorage (EncryptedSharedPreferences)
            try {
                SecureStorageManager.clearAll()
                Log.i(TAG, "EncryptedSharedPreferences pulite")
            } catch (e: Exception) {
                Log.e(TAG, "Errore pulizia SecureStorage: ${e.message}", e)
            }

            // 2) Cancella SharedPreferences di Signal Protocol (signal_store)
            try {
                val prefsName = "signal_store"
                val prefs: SharedPreferences = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
                prefs.edit().clear().apply()
                Log.i(TAG, "SignalProtocol SharedPreferences ($prefsName) cancellate")
            } catch (e: Exception) {
                Log.e(TAG, "Errore cancellazione SignalProtocol prefs: ${e.message}", e)
            }

            // 3) Sovrascrivi e cancella chiavi effimere
            try {
                EphemeralKeyManager.destroyKyberPrivateKey(context, userId)
                EphemeralKeyManager.destroyRsaEphemeralKey(userId)
                Log.i(TAG, "Chiavi effimere soprascritte e distrutte")
            } catch (e: Exception) {
                Log.e(TAG, "Errore distruzione chiavi effimere: ${e.message}", e)
            }

            // 4) Distruggi sessioni Double Ratchet in memoria
            try {
                // Non esiste metodo diretto per cancellare lo store in DoubleRatchetManager
                // Dunque ricreiamo lo store per annullare sessioni precedenti
                DoubleRatchetManager.initializeUser(context, localUserName, localDeviceId)
                Log.i(TAG, "Sessioni Double Ratchet rigenerate (memoria pulita)")
            } catch (e: Exception) {
                Log.e(TAG, "Errore reset Double Ratchet: ${e.message}", e)
            }

            // 5) Elimina cache e file temporanei sensibili
            try {
                // Directory cache
                val cacheDir = context.cacheDir
                deleteDirectoryRecursively(cacheDir)
                // Files directory (solo cartelle sensibili: "seal", "zkp", "signal_store" ecc.)
                deleteIfExists(File(context.filesDir, "seal"))
                deleteIfExists(File(context.filesDir, "zkp"))
                deleteIfExists(File(context.filesDir, "signal_store.xml"))
                Log.i(TAG, "Cache e file temporanei sensibili eliminati")
            } catch (e: Exception) {
                Log.e(TAG, "Errore eliminazione cache/files: ${e.message}", e)
            }

            // 6) Termina processi di background legati a GhostBridge (facoltativo)
            try {
                val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val packageName = context.packageName
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.FROYO) {
                    am.killBackgroundProcesses(packageName)
                } else {
                    @Suppress("DEPRECATION")
                    am.restartPackage(packageName)
                }
                Log.i(TAG, "Processi di background GhostBridge terminati")
            } catch (e: Exception) {
                Log.e(TAG, "Errore terminazione processi di background: ${e.message}", e)
            }

            Log.i(TAG, "Pulizia sessione sicura completata per userId=$userId")
        } catch (e: Exception) {
            Log.e(TAG, "Errore in SecureSessionCleaner.cleanAll: ${e.message}", e)
        }
    }

    private fun deleteDirectoryRecursively(dir: File) {
        if (dir.exists()) {
            dir.listFiles()?.forEach { file ->
                if (file.isDirectory) {
                    deleteDirectoryRecursively(file)
                } else {
                    file.delete()
                }
            }
        }
    }

    private fun deleteIfExists(file: File) {
        if (file.exists()) {
            if (file.isDirectory) deleteDirectoryRecursively(file) else file.delete()
        }
    }
}
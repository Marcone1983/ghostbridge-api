package com.ghostbridge.crypto.security

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Process
import android.util.Log
import java.io.File
import java.security.KeyStore

/**
 * EmergencyBurnManager:
 * Feature 16 – "Emergency Burn System": distrugge tutti i dati sensibili in un istante su gesto
 *
 * File: app/src/main/java/com/ghostbridge/crypto/security/EmergencyBurnManager.kt
 */
object EmergencyBurnManager {
    private const val TAG = "EmergencyBurnManager"
    private const val KEYSTORE = "AndroidKeyStore"
    // Prefissi di alias da cancellare
    private val KEY_ALIASES_PREFIXES = listOf(
        "AES_KEY_USER_",
        "ECDSA_KEY_USER_",
        "RSA_KEY_USER_",
        "SECURE_ENV_KEY_USER_",
        "RSA2048_KEY_USER_",
        "RSA_EPHEMERAL_KEY_USER_"
    )

    /**
     * Trigger immediato dell'"Emergency Burn":  
     * - Pulisce sessione sicura (es. SecureSessionCleaner)  
     * - Cancella ogni alias in AndroidKeyStore con prefissi noti  
     * - Elimina tutti i file in filesDir, cacheDir, externalCacheDir  
     * - Cancella SharedPreferences (incluse EncryptedSharedPreferences)  
     * - Termina il processo dell'app  
     */
    @JvmStatic
    fun triggerBurn(context: Context, userId: Int, localUserName: String, localDeviceId: Int) {
        try {
            Log.i(TAG, "Emergency Burn avviato")

            // 1) Pulizia sessione sicura
            try {
                SecureSessionCleaner.cleanAll(context, userId, localUserName, localDeviceId)
                Log.i(TAG, "SecureSessionCleaner eseguito")
            } catch (e: Exception) {
                Log.e(TAG, "Errore SecureSessionCleaner durante Burn: ${e.message}", e)
            }

            // 2) Cancella tutte le chiavi in AndroidKeyStore con prefissi noti
            try {
                val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
                val aliases = keyStore.aliases()
                while (aliases.hasMoreElements()) {
                    val alias = aliases.nextElement()
                    if (KEY_ALIASES_PREFIXES.any { alias.startsWith(it) }) {
                        keyStore.deleteEntry(alias)
                        Log.i(TAG, "KeyStore alias cancellato: $alias")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Errore cancellazione KeyStore alias: ${e.message}", e)
            }

            // 3) Elimina directory filesDir
            try {
                deleteDirectoryRecursively(context.filesDir)
                Log.i(TAG, "filesDir cancellata")
            } catch (e: Exception) {
                Log.e(TAG, "Errore cancellazione filesDir: ${e.message}", e)
            }

            // 4) Elimina directory cacheDir
            try {
                deleteDirectoryRecursively(context.cacheDir)
                Log.i(TAG, "cacheDir cancellata")
            } catch (e: Exception) {
                Log.e(TAG, "Errore cancellazione cacheDir: ${e.message}", e)
            }

            // 5) Elimina directory externalCacheDir (se esiste)
            try {
                context.externalCacheDir?.let {
                    deleteDirectoryRecursively(it)
                    Log.i(TAG, "externalCacheDir cancellata")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Errore cancellazione externalCacheDir: ${e.message}", e)
            }

            // 6) Cancella tutte le SharedPreferences (incluse EncryptedSharedPreferences)
            try {
                val prefsDir = File(context.applicationInfo.dataDir, "shared_prefs")
                if (prefsDir.exists()) {
                    prefsDir.listFiles()?.forEach { it.delete() }
                    Log.i(TAG, "SharedPreferences cancellate")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Errore cancellazione SharedPreferences: ${e.message}", e)
            }

            // 7) Termina processi di background e poi il processo
            try {
                val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val packageName = context.packageName
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.FROYO) {
                    am.killBackgroundProcesses(packageName)
                } else {
                    @Suppress("DEPRECATION")
                    am.restartPackage(packageName)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Errore killBackgroundProcesses: ${e.message}", e)
            }

            // 8) Kill process attuale
            Process.killProcess(Process.myPid())
            System.exit(1)
        } catch (e: Exception) {
            Log.e(TAG, "Errore in triggerBurn: ${e.message}", e)
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
            dir.delete()
        }
    }
}
package com.ghostbridge.network.tor

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import java.io.File
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.concurrent.TimeUnit

/**
 * TorManager:
 * Feature 25 – "Onion Routing Reale": integra un'istanza Tor nativa in Android
 * e fornisce un client HTTP (OkHttp) che instrada tutto il traffico attraverso Tor.
 *
 * Dipendenze (module build.gradle):
 * ```gradle
 * implementation "com.github.micahflee:tor-android-sdk:0.1.0"
 * implementation "com.squareup.okhttp3:okhttp:4.9.3"
 * ```
 *
 * File: app/src/main/java/com/ghostbridge/network/tor/TorManager.kt
 *
 * - Avvia Tor in background usando TorAndroid library.
 * - Attende il completamento del bootstrap (stato "Bootstrapped 100%").
 * - Espone un metodo per ottenere un OkHttpClient già configurato con proxy SOCKS5
 *   puntato a 127.0.0.1:9050 (Tor).
 * - Log completo dello stato di Tor per debug enterprise.
 */

object TorManager {
    private const val TAG = "TorManager"
    private const val TOR_SOCKS_PROXY_HOST = "127.0.0.1"
    private const val TOR_SOCKS_PROXY_PORT = 9050
    private const val TOR_CONTROL_PORT = 9051
    private const val TOR_DATA_DIR = "tor_data"

    private var torProcess: com.micahflee.torcontrol.TorManager? = null
    private var isBootstrapped = false
    private val bootstrapMutex = Mutex()

    /**
     * Inizializza e avvia Tor in modo asincrono.
     * Deve essere chiamato all'avvio dell'app (es. in Application.onCreate).
     *
     * @param context Context per configurare directory dati.
     */
    @JvmStatic
    fun startTor(context: Context) {
        if (torProcess != null) {
            Log.i(TAG, "Tor è già in esecuzione")
            return
        }
        // Cartella di dati di Tor all'interno di filesDir
        val dataDir = File(context.filesDir, TOR_DATA_DIR)
        if (!dataDir.exists()) {
            dataDir.mkdirs()
        }

        // Instanzia TorManager da TorAndroid SDK
        torProcess = com.micahflee.torcontrol.TorManager(
            context = context,
            torConfig = com.micahflee.torcontrol.TorManager.TorConfig(
                // Usa la cartella dati app-specifica
                dataDirectory = dataDir.absolutePath,
                // Porte standard per SOCKS e Control
                socksPort = TOR_SOCKS_PROXY_PORT,
                controlPort = TOR_CONTROL_PORT,
                // Permetti autenticazione tramite cookie
                cookieAuthentication = true
            )
        )

        // Avvia Tor in Coroutine
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.i(TAG, "Avvio di Tor in corso...")
                torProcess?.start()
                // Registra un watcher sul log di Tor per sapere quando è bootstrapped
                torProcess?.addObserver { event ->
                    if (event.contains("Bootstrapped 100%")) {
                        Log.i(TAG, "Tor completato bootstrap: 100%")
                        bootstrapMutex.withLock {
                            isBootstrapped = true
                        }
                    } else {
                        Log.d(TAG, "Tor log: $event")
                    }
                }
                // Attendi fino a bootstrap completo o timeout (60s)
                withTimeout(60_000) {
                    while (true) {
                        bootstrapMutex.withLock {
                            if (isBootstrapped) return@withTimeout
                        }
                        delay(500)
                    }
                }
                Log.i(TAG, "Tor è pronto per l'uso")
            } catch (e: Exception) {
                Log.e(TAG, "Errore avviando Tor: ${e.message}", e)
            }
        }
    }

    /**
     * Restituisce un OkHttpClient che instrada le richieste via Tor (SOCKS5).
     * Deve essere chiamato dopo che Tor è bootstrapped al 100%.
     *
     * @return OkHttpClient configurato con proxy SOCKS5 verso Tor.
     */
    @JvmStatic
    fun getOkHttpClientViaTor(): OkHttpClient {
        // Proxy SOCKS5 verso Tor in ascolto sulla porta 9050
        val proxy = Proxy(
            Proxy.Type.SOCKS,
            InetSocketAddress(TOR_SOCKS_PROXY_HOST, TOR_SOCKS_PROXY_PORT)
        )
        return OkHttpClient.Builder()
            .proxy(proxy)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Verifica se Tor ha completato il bootstrap.
     * @return true se Tor è pronto, false altrimenti.
     */
    @JvmStatic
    fun isTorReady(): Boolean {
        return if (torProcess == null) {
            false
        } else {
            runBlocking {
                bootstrapMutex.withLock { isBootstrapped }
            }
        }
    }

    /**
     * Ferma Tor e libera le risorse.
     * Deve essere chiamato quando l'app viene chiusa (es. Application.onTerminate).
     */
    @JvmStatic
    fun stopTor() {
        try {
            torProcess?.stop()
            torProcess = null
            isBootstrapped = false
            Log.i(TAG, "Tor arrestato correttamente")
        } catch (e: Exception) {
            Log.e(TAG, "Errore arrestando Tor: ${e.message}", e)
        }
    }
}
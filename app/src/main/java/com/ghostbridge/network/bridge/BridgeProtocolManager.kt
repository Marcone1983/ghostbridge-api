package com.ghostbridge.network.bridge

import android.util.Log
import kotlinx.coroutines.*
import java.io.InputStream
import java.io.OutputStream
import java.net.ServerSocket
import java.net.Socket
import java.security.*
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.util.concurrent.atomic.AtomicBoolean

/**
 * BridgeProtocolManager:
 * Feature 26 – "Bridge Protocol Semplificato": Comunicazione diretta ultra-cifrata
 * fra due peer, mediante handshake ECDH e cifratura AES–GCM.
 *
 * File: app/src/main/java/com/ghostbridge/network/bridge/BridgeProtocolManager.kt
 *
 * – Genera coppia di chiavi ECDH su curva prime256v1 (secp256r1).
 * – Esegue handshake scambiando PublicKey in chiaro.
 * – Deriva chiave AES–256 (SHA-256 su secret shared).
 * – Usa AES/GCM con IV casuale 12 byte per cifrare i payload.
 * – Fornisce metodi sendEncrypted(data) / onReceiveEncrypted(callback).
 * – Gestisce sia modalità server (listen) che client (connect).
 */

class BridgeProtocolManager(
    private val localPort: Int
) {
    companion object {
        private const val TAG = "BridgeProtocol"
        private const val ECDH_ALGORITHM = "EC"
        private const val EC_CURVE = "secp256r1"
        private const val KEY_AGREEMENT_ALGORITHM = "ECDH"
        private const val AES_ALGORITHM = "AES/GCM/NoPadding"
        private const val AES_KEY_SIZE_BYTES = 32
        private const val GCM_IV_SIZE_BYTES = 12
        private const val GCM_TAG_BITS = 128
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Handshake state
    private lateinit var keyPair: KeyPair
    private var sharedSecret: ByteArray? = null
    private var aesKey: SecretKeySpec? = null

    // Networking
    private var serverSocket: ServerSocket? = null
    private var socket: Socket? = null
    private var inStream: InputStream? = null
    private var outStream: OutputStream? = null

    private val isConnected = AtomicBoolean(false)
    private var receiveCallback: ((ByteArray) -> Unit)? = null

    /**
     * Inizia ad ascoltare sul localPort. Quando arriva una connessione, esegue handshake ECDH
     * e se va a buon fine imposta canale cifrato. Call this in App startup if expecting connections.
     */
    fun startListening() {
        scope.launch {
            try {
                serverSocket = ServerSocket(localPort)
                Log.i(TAG, "BridgeServer in ascolto su porta $localPort")
                val client = serverSocket!!.accept()
                Log.i(TAG, "Peer connesso da ${client.inetAddress.hostAddress}:${client.port}")
                socket = client
                initializeStreams()
                performServerHandshake()
                startReceiveLoop()
            } catch (e: Exception) {
                Log.e(TAG, "Errore in startListening: ${e.message}", e)
            }
        }
    }

    /**
     * Connette al peer in host:port, quindi esegue handshake ECDH.
     */
    fun connectToPeer(host: String, port: Int) {
        scope.launch {
            try {
                val client = Socket(host, port)
                Log.i(TAG, "Connessione a peer ${host}:${port} stabilita")
                socket = client
                initializeStreams()
                performClientHandshake()
                startReceiveLoop()
            } catch (e: Exception) {
                Log.e(TAG, "Errore in connectToPeer: ${e.message}", e)
            }
        }
    }

    /**
     * Imposta InputStream e OutputStream dopo che socket è connesso.
     */
    private fun initializeStreams() {
        inStream = socket?.getInputStream()
        outStream = socket?.getOutputStream()
    }

    /**
     * Genera coppia di chiavi ECDH su curva prime256v1.
     */
    private fun generateECDHKeyPair(): KeyPair {
        val keyGen = KeyPairGenerator.getInstance(ECDH_ALGORITHM, "AndroidKeyStore")
        val ecSpec = java.security.spec.ECGenParameterSpec(EC_CURVE)
        keyGen.initialize(ecSpec)
        return keyGen.generateKeyPair()
    }

    /**
     * Handshake lato server:
     * 1) Genera keyPair e invia publicKey byte[] al client.
     * 2) Riceve publicKey del client, calcola shared secret, derive AES key.
     */
    private suspend fun performServerHandshake() {
        withContext(Dispatchers.IO) {
            try {
                keyPair = generateECDHKeyPair()
                val pubKeyBytes = keyPair.public.encoded
                // Invia lunghezza + publicKey
                val lengthBuf = pubKeyBytes.size.toByteArrayInt()
                outStream!!.write(lengthBuf)
                outStream!!.write(pubKeyBytes)
                outStream!!.flush()
                Log.i(TAG, "ServerHandshake: inviato PublicKey (${pubKeyBytes.size} bytes)")

                // Ricevi publicKey client
                val clientPubKeyBytes = readBytesWithLength(inStream!!)
                Log.i(TAG, "ServerHandshake: ricevuto PublicKey client (${clientPubKeyBytes.size} bytes)")

                deriveSharedSecret(clientPubKeyBytes)
                isConnected.set(true)
                Log.i(TAG, "ServerHandshake: handshake completato, canale cifrato pronto")
            } catch (e: Exception) {
                Log.e(TAG, "Errore in performServerHandshake: ${e.message}", e)
            }
        }
    }

    /**
     * Handshake lato client:
     * 1) Genera keyPair, riceve publicKey server.
     * 2) Invio publicKey client, calcolo shared secret, derive AES key.
     */
    private suspend fun performClientHandshake() {
        withContext(Dispatchers.IO) {
            try {
                keyPair = generateECDHKeyPair()
                // Ricevi publicKey server
                val serverPubKeyBytes = readBytesWithLength(inStream!!)
                Log.i(TAG, "ClientHandshake: ricevuto PublicKey server (${serverPubKeyBytes.size} bytes)")

                // Invia publicKey client
                val pubKeyBytes = keyPair.public.encoded
                val lengthBuf = pubKeyBytes.size.toByteArrayInt()
                outStream!!.write(lengthBuf)
                outStream!!.write(pubKeyBytes)
                outStream!!.flush()
                Log.i(TAG, "ClientHandshake: inviato PublicKey client (${pubKeyBytes.size} bytes)")

                deriveSharedSecret(serverPubKeyBytes)
                isConnected.set(true)
                Log.i(TAG, "ClientHandshake: handshake completato, canale cifrato pronto")
            } catch (e: Exception) {
                Log.e(TAG, "Errore in performClientHandshake: ${e.message}", e)
            }
        }
    }

    /**
     * Legge esattamente 4 byte per lunghezza e poi quel numero di byte da InputStream.
     */
    @Throws(Exception::class)
    private fun readBytesWithLength(stream: InputStream): ByteArray {
        val lenBuf = ByteArray(4)
        stream.readFully(lenBuf)
        val length = lenBuf.toIntFromByteArray()
        val data = ByteArray(length)
        stream.readFully(data)
        return data
    }

    /**
     * Deriva shared secret da publicKeyPeerEncoded:  
     * - ricrea PublicKey
     * - KeyAgreement ECDH
     * - ottiene secret 32 byte, passa in SHA-256 per AES key.
     */
    private fun deriveSharedSecret(peerPubKeyEncoded: ByteArray) {
        try {
            val kf = KeyFactory.getInstance(ECDH_ALGORITHM)
            val pubSpec = X509EncodedKeySpec(peerPubKeyEncoded)
            val peerPublicKey = kf.generatePublic(pubSpec)

            val keyAgree = KeyAgreement.getInstance(KEY_AGREEMENT_ALGORITHM)
            keyAgree.init(keyPair.private)
            keyAgree.doPhase(peerPublicKey, true)
            val secret = keyAgree.generateSecret()
            // Deriva AES key: hash SHA-256 e prendi i primi 32 byte
            val sha256 = MessageDigest.getInstance("SHA-256")
            val derived = sha256.digest(secret)
            val aesKeyBytes = derived.copyOfRange(0, AES_KEY_SIZE_BYTES)
            aesKey = SecretKeySpec(aesKeyBytes, "AES")
            sharedSecret = secret
            Log.i(TAG, "Shared secret derivato e AES–256 pronto")
        } catch (e: Exception) {
            Log.e(TAG, "Errore deriveSharedSecret: ${e.message}", e)
        }
    }

    /**
     * Invia data cifrato con AES–GCM. 
     * Formato: [4-byte length IV][IV][4-byte length ciphertext][ciphertext]
     */
    fun sendEncrypted(data: ByteArray) {
        scope.launch {
            if (!isConnected.get() || aesKey == null) {
                Log.e(TAG, "sendEncrypted: canale non connesso o AES key mancante")
                return@launch
            }
            try {
                // Genera IV casuale 12 byte
                val iv = ByteArray(GCM_IV_SIZE_BYTES).apply {
                    SecureRandom().nextBytes(this)
                }
                val cipher = Cipher.getInstance(AES_ALGORITHM)
                val spec = GCMParameterSpec(GCM_TAG_BITS, iv)
                cipher.init(Cipher.ENCRYPT_MODE, aesKey, spec)
                val ciphertext = cipher.doFinal(data)

                // Prepara buffer di invio
                val ivLenBuf = iv.size.toByteArrayInt()
                val ctLenBuf = ciphertext.size.toByteArrayInt()
                synchronized(outStream!!) {
                    outStream!!.write(ivLenBuf)
                    outStream!!.write(iv)
                    outStream!!.write(ctLenBuf)
                    outStream!!.write(ciphertext)
                    outStream!!.flush()
                }
                Log.i(TAG, "sendEncrypted: inviati ${ciphertext.size} byte cifrati")
            } catch (e: Exception) {
                Log.e(TAG, "Errore sendEncrypted: ${e.message}", e)
            }
        }
    }

    /**
     * Imposta un callback che viene invocato quando arrivano dati cifrati. 
     * Esegue decifratura AES–GCM e passa il plaintext a callback.
     */
    fun onReceiveEncrypted(callback: (ByteArray) -> Unit) {
        receiveCallback = callback
    }

    /**
     * Loop continuo per leggere messaggi cifrati, decifrare e chiamare callback.
     */
    private fun startReceiveLoop() {
        scope.launch {
            try {
                while (isConnected.get()) {
                    // Leggi IV
                    val ivBytes = readBytesWithLength(inStream!!)
                    // Leggi ciphertext
                    val ctBytes = readBytesWithLength(inStream!!)
                    // Decifra
                    val cipher = Cipher.getInstance(AES_ALGORITHM)
                    val spec = GCMParameterSpec(GCM_TAG_BITS, ivBytes)
                    cipher.init(Cipher.DECRYPT_MODE, aesKey, spec)
                    val plaintext = cipher.doFinal(ctBytes)
                    Log.i(TAG, "startReceiveLoop: ricevuti ${ctBytes.size} byte cifrati, decifrati ${plaintext.size} byte")
                    // Chiama callback
                    receiveCallback?.invoke(plaintext)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Errore startReceiveLoop: ${e.message}", e)
            }
        }
    }

    /**
     * Chiude socket e libera risorse.
     */
    fun close() {
        try {
            isConnected.set(false)
            socket?.close()
            serverSocket?.close()
            scope.cancel()
            Log.i(TAG, "BridgeProtocolManager: risorse chiuse")
        } catch (e: Exception) {
            Log.e(TAG, "Errore close(): ${e.message}", e)
        }
    }

    /** Estensione: converte Int a 4 byte in big-endian */
    private fun Int.toByteArrayInt(): ByteArray {
        return byteArrayOf(
            (this shr 24 and 0xFF).toByte(),
            (this shr 16 and 0xFF).toByte(),
            (this shr 8 and 0xFF).toByte(),
            (this and 0xFF).toByte()
        )
    }

    /** Estensione: converte 4 byte big-endian a Int */
    private fun ByteArray.toIntFromByteArray(): Int {
        require(size >= 4) { "ByteArray troppo corto per convertire in Int" }
        return ((this[0].toInt() and 0xFF) shl 24) or
               ((this[1].toInt() and 0xFF) shl 16) or
               ((this[2].toInt() and 0xFF) shl 8) or
               (this[3].toInt() and 0xFF)
    }

    /** Legge esattamente buffer.size byte da InputStream, blocca finché non finiscono */
    private fun InputStream.readFully(buffer: ByteArray) {
        var offset = 0
        while (offset < buffer.size) {
            val read = this.read(buffer, offset, buffer.size - offset)
            if (read < 0) throw RuntimeException("Stream chiuso prematuramente")
            offset += read
        }
    }
}
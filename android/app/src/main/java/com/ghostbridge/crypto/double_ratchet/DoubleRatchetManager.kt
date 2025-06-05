package com.ghostbridge.crypto.double_ratchet

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import org.whispersystems.libsignal.*
import org.whispersystems.libsignal.ecc.ECKeyPair
import org.whispersystems.libsignal.ecc.Curve
import org.whispersystems.libsignal.kdf.HKDFv3
import org.whispersystems.libsignal.protocol.ProtocolAddress
import org.whispersystems.libsignal.state.*
import org.whispersystems.libsignal.state.impl.InMemoryPreKeyStore
import org.whispersystems.libsignal.state.impl.InMemorySessionStore
import org.whispersystems.libsignal.state.impl.InMemorySignedPreKeyStore
import org.whispersystems.libsignal.state.impl.InMemorySenderKeyStore
import org.whispersystems.libsignal.state.impl.SharedPreferencesIdentityKeyStore
import org.whispersystems.libsignal.util.KeyHelper
import org.whispersystems.libsignal.util.InvalidKeyException

/**
 * DoubleRatchetManager:
 * Implementa il Double Ratchet Protocol (versione libsignal-protocol) per GhostBridge.
 *
 * Dipendenza (app/build.gradle):
 * implementation "org.whispersystems:signal-protocol-java:2.8.0"
 *
 * File: app/src/main/java/com/ghostbridge/crypto/double_ratchet/DoubleRatchetManager.kt
 */
object DoubleRatchetManager {
    private const val TAG = "DoubleRatchetManager"

    /**
     * SignalStore: gestisce tutti gli store necessari (identity, prekey, signed-prekey, session, sender-key),
     * basati su SharedPreferences per persistenza.
     */
    private class SignalStore(context: Context) : SignalProtocolStore {
        private val prefs: SharedPreferences =
            context.getSharedPreferences("signal_store", Context.MODE_PRIVATE)

        // In-memory wrappers per velocizzare l'accesso, sincronizzati con prefs
        private val identityStore: IdentityKeyStore
        private val preKeyStore: PreKeyStore
        private val signedPreKeyStore: SignedPreKeyStore
        private val sessionStore: SessionStore
        private val senderKeyStore: SenderKeyStore

        init {
            // IdentityKeyStore che memorizza ID locale e chiave pubblica/privata
            identityStore = SharedPreferencesIdentityKeyStore(prefs)

            // PreKeyStore, SignedPreKeyStore, SessionStore e SenderKeyStore in memoria
            preKeyStore = InMemoryPreKeyStore()
            signedPreKeyStore = InMemorySignedPreKeyStore()
            sessionStore = InMemorySessionStore()
            senderKeyStore = InMemorySenderKeyStore()

            // Carica da prefs eventuali chiavi già salvate
            loadIdentityKeys()
            loadPreKeys()
            loadSignedPreKeys()
            loadSessions()
            // SenderKeyStore (usato per gruppi) viene gestito solo in memoria
        }

        // ------------------------------------------------------------
        // IdentityKeyStore methods
        // ------------------------------------------------------------
        override fun getIdentityKeyPair(): IdentityKeyPair {
            return identityStore.identityKeyPair
        }

        override fun getLocalRegistrationId(): Int {
            return identityStore.localRegistrationId
        }

        override fun saveIdentity(address: SignalProtocolAddress?, identityKey: IdentityKey?) {
            if (address != null && identityKey != null) {
                identityStore.saveIdentity(address, identityKey)
            }
        }

        override fun isTrustedIdentity(address: SignalProtocolAddress?, identityKey: IdentityKey?): Boolean {
            return identityStore.isTrustedIdentity(address, identityKey)
        }

        override fun getIdentity(address: SignalProtocolAddress?): IdentityKey? {
            return identityStore.getIdentity(address)
        }

        override fun removeIdentity(address: SignalProtocolAddress?) {
            if (address != null) {
                identityStore.removeIdentity(address)
            }
        }

        // ------------------------------------------------------------
        // PreKeyStore methods
        // ------------------------------------------------------------
        override fun loadPreKey(preKeyId: Int): PreKeyRecord? {
            return preKeyStore.loadPreKey(preKeyId)
        }

        override fun storePreKey(preKeyId: Int, record: PreKeyRecord?) {
            if (record != null) {
                preKeyStore.storePreKey(preKeyId, record)
                // Persistiamo su prefs
                prefs.edit().putString("prekey_$preKeyId", Base64.encodeToString(record.serialize(), Base64.NO_WRAP)).apply()
            }
        }

        override fun containsPreKey(preKeyId: Int): Boolean {
            return preKeyStore.containsPreKey(preKeyId)
        }

        override fun removePreKey(preKeyId: Int) {
            preKeyStore.removePreKey(preKeyId)
            prefs.edit().remove("prekey_$preKeyId").apply()
        }

        // ------------------------------------------------------------
        // SignedPreKeyStore methods
        // ------------------------------------------------------------
        override fun loadSignedPreKey(signedPreKeyId: Int): SignedPreKeyRecord? {
            return signedPreKeyStore.loadSignedPreKey(signedPreKeyId)
        }

        override fun storeSignedPreKey(signedPreKeyId: Int, record: SignedPreKeyRecord?) {
            if (record != null) {
                signedPreKeyStore.storeSignedPreKey(signedPreKeyId, record)
                prefs.edit().putString(
                    "signedprekey_$signedPreKeyId",
                    Base64.encodeToString(record.serialize(), Base64.NO_WRAP)
                ).apply()
            }
        }

        override fun containsSignedPreKey(signedPreKeyId: Int): Boolean {
            return signedPreKeyStore.containsSignedPreKey(signedPreKeyId)
        }

        override fun removeSignedPreKey(signedPreKeyId: Int) {
            signedPreKeyStore.removeSignedPreKey(signedPreKeyId)
            prefs.edit().remove("signedprekey_$signedPreKeyId").apply()
        }

        // ------------------------------------------------------------
        // SessionStore methods
        // ------------------------------------------------------------
        override fun loadSession(address: SignalProtocolAddress?): SessionRecord? {
            return sessionStore.loadSession(address)
        }

        override fun getSubDeviceSessions(name: String?): List<Int> {
            return sessionStore.getSubDeviceSessions(name)
        }

        override fun storeSession(address: SignalProtocolAddress?, record: SessionRecord?) {
            if (address != null && record != null) {
                sessionStore.storeSession(address, record)
                // Persistiamo
                val key = "session_${address.name}_${address.deviceId}"
                prefs.edit().putString(key, Base64.encodeToString(record.serialize(), Base64.NO_WRAP)).apply()
            }
        }

        override fun containsSession(address: SignalProtocolAddress?): Boolean {
            return sessionStore.containsSession(address)
        }

        override fun deleteSession(address: SignalProtocolAddress?) {
            sessionStore.deleteSession(address)
            if (address != null) {
                prefs.edit().remove("session_${address.name}_${address.deviceId}").apply()
            }
        }

        // ------------------------------------------------------------
        // SenderKeyStore (gruppi) – usiamo in-memory, non persistiamo
        // ------------------------------------------------------------
        override fun loadSenderKey(senderKeyId: SenderKeyName?): SenderKeyRecord? {
            return senderKeyStore.loadSenderKey(senderKeyId)
        }

        override fun storeSenderKey(senderKeyId: SenderKeyName?, record: SenderKeyRecord?) {
            if (senderKeyId != null && record != null) {
                senderKeyStore.storeSenderKey(senderKeyId, record)
            }
        }

        override fun containsSenderKey(senderKeyId: SenderKeyName?): Boolean {
            return senderKeyStore.containsSenderKey(senderKeyId)
        }

        override fun deleteSenderKey(senderKeyId: SenderKeyName?) {
            senderKeyStore.deleteSenderKey(senderKeyId)
        }

        // ------------------------------------------------------------
        // Funzioni di caricamento da SharedPreferences all'inizializzazione
        // ------------------------------------------------------------
        private fun loadIdentityKeys() {
            val ikpB64 = prefs.getString("identityKeyPair", null)
            val regId = prefs.getInt("registrationId", -1)
            if (ikpB64 != null && regId != -1) {
                val ikpBytes = Base64.decode(ikpB64, Base64.NO_WRAP)
                val ikp = IdentityKeyPair(ikpBytes, 0)
                identityStore.initialize(ikp, regId)
            } else {
                // Generiamo nuove
                val ikPair: IdentityKeyPair = KeyHelper.generateIdentityKeyPair()
                val regIdentityId: Int = KeyHelper.generateRegistrationId(false)
                identityStore.initialize(ikPair, regIdentityId)
                prefs.edit()
                    .putString("identityKeyPair", Base64.encodeToString(ikPair.serialize(), Base64.NO_WRAP))
                    .putInt("registrationId", regIdentityId)
                    .apply()
            }
        }

        private fun loadPreKeys() {
            val maxPreKeyId = prefs.getInt("maxPreKeyId", 0)
            for (id in 1..maxPreKeyId) {
                val b64 = prefs.getString("prekey_$id", null) ?: continue
                val record = PreKeyRecord(Base64.decode(b64, Base64.NO_WRAP))
                preKeyStore.storePreKey(id, record)
            }
        }

        private fun loadSignedPreKeys() {
            val maxSignedId = prefs.getInt("maxSignedPreKeyId", 0)
            for (id in 1..maxSignedId) {
                val b64 = prefs.getString("signedprekey_$id", null) ?: continue
                val record = SignedPreKeyRecord(Base64.decode(b64, Base64.NO_WRAP))
                signedPreKeyStore.storeSignedPreKey(id, record)
            }
        }

        private fun loadSessions() {
            for ((key, value) in prefs.all) {
                if (key.startsWith("session_") && value is String) {
                    val parts = key.removePrefix("session_").split("_")
                    if (parts.size == 2) {
                        val name = parts[0]
                        val deviceId = parts[1].toIntOrNull() ?: continue
                        val record = SessionRecord(Base64.decode(value, Base64.NO_WRAP))
                        sessionStore.storeSession(ProtocolAddress(name, deviceId), record)
                    }
                }
            }
        }
    }

    /**
     * Inizializza (o recupera) lo store per l'utente locale.
     * Genera IdentityKeyPair, PreKeys e SignedPreKeys se non esistono.
     */
    @Synchronized
    fun initializeUser(context: Context, localUserName: String, localDeviceId: Int) {
        val store = SignalStore(context)

        // 1) IdentityKeyPair e registrationId già generati in SignalStore.init()
        val identityKeyPair = store.getIdentityKeyPair()
        val registrationId = store.getLocalRegistrationId()

        // 2) Genera un set di PreKeys (es. 100) se non già presenti
        val maxPreKeyId = 100
        for (id in 1..maxPreKeyId) {
            if (!store.containsPreKey(id)) {
                val preKeyPair: ECKeyPair = KeyHelper.generatePreKey(id)
                val preKeyRecord = PreKeyRecord(id, preKeyPair)
                store.storePreKey(id, preKeyRecord)
            }
        }
        store.prefs.edit().putInt("maxPreKeyId", maxPreKeyId).apply()

        // 3) Genera un SignedPreKey con ID fisso (es. 1) se non presente
        val signedId = 1
        if (!store.containsSignedPreKey(signedId)) {
            val signedPreKeyPair: ECKeyPair = KeyHelper.generateSignedPreKey(identityKeyPair, signedId)
            val signedPreKeyRecord = SignedPreKeyRecord(signedId, System.currentTimeMillis(), signedPreKeyPair, identityKeyPair.signature)
            store.storeSignedPreKey(signedId, signedPreKeyRecord)
        }
        store.prefs.edit().putInt("maxSignedPreKeyId", 1).apply()

        Log.i(TAG, "DoubleRatchet: utente '$localUserName' inizializzato (deviceId=$localDeviceId).")
    }

    /**
     * Crea e ritorna un PreKeyBundle da inviare al server (o a un altro utente) per stabilire la sessione.
     */
    fun getLocalPreKeyBundle(context: Context, localUserName: String, localDeviceId: Int): PreKeyBundle {
        val store = SignalStore(context)
        val registrationId = store.getLocalRegistrationId()
        val identityKeyPair = store.getIdentityKeyPair()
        val identityKey = identityKeyPair.identityKey

        // Prendiamo una PreKey casuale esistente (usiamo ID=1..100)
        val preKeyId = 1
        val preKeyRecord = store.loadPreKey(preKeyId) ?: throw InvalidKeyException("PreKey non trovato")
        val signedPreKeyId = 1
        val signedPreKeyRecord = store.loadSignedPreKey(signedPreKeyId)
            ?: throw InvalidKeyException("SignedPreKey non trovato")

        return PreKeyBundle(
            registrationId,
            localDeviceId,
            preKeyId,
            preKeyRecord.keyPair.publicKey,
            signedPreKeyId,
            signedPreKeyRecord.keyPair.publicKey,
            signedPreKeyRecord.signature,
            identityKey.publicKey
        )
    }

    /**
     * Stabilisce una sessione con un utente remoto, dato il suo PreKeyBundle ricevuto.
     */
    @Throws(Exception::class)
    fun createSessionWithRemote(
        context: Context,
        localUserName: String,
        localDeviceId: Int,
        remoteUserName: String,
        remoteDeviceId: Int,
        remotePreKeyBundle: PreKeyBundle
    ) {
        val store = SignalStore(context)
        val address = ProtocolAddress(remoteUserName, remoteDeviceId)
        val sessionBuilder = SessionBuilder(store, address)
        sessionBuilder.process(remotePreKeyBundle)
        Log.i(TAG, "Sessione creata con $remoteUserName (device $remoteDeviceId).")
    }

    /**
     * Cripta un messaggio testuale destinato a remoteUserName:remoteDeviceId.
     * Ritorna il ciphertext binario.
     */
    @Throws(Exception::class)
    fun encryptMessage(
        context: Context,
        localUserName: String,
        localDeviceId: Int,
        remoteUserName: String,
        remoteDeviceId: Int,
        plaintext: ByteArray
    ): ByteArray {
        val store = SignalStore(context)
        val address = ProtocolAddress(remoteUserName, remoteDeviceId)
        val sessionCipher = SessionCipher(store, address)
        val message = sessionCipher.encrypt(plaintext)
        return when (message) {
            is CiphertextMessage -> message.serialize()
            is PreKeySignalMessage -> message.serialize()
            else -> throw IllegalStateException("Tipo di messaggio non supportato")
        }
    }

    /**
     * Decripta un ciphertext ricevuto da remoteUserName:remoteDeviceId.
     * Ritorna il plaintext in ByteArray.
     */
    @Throws(Exception::class)
    fun decryptMessage(
        context: Context,
        localUserName: String,
        localDeviceId: Int,
        remoteUserName: String,
        remoteDeviceId: Int,
        ciphertext: ByteArray
    ): ByteArray {
        val store = SignalStore(context)
        val address = ProtocolAddress(remoteUserName, remoteDeviceId)
        return try {
            val sessionCipher = SessionCipher(store, address)
            // Identifica il tipo di messaggio: PreKeySignalMessage o CiphertextMessage
            if (PreKeySignalMessage.isInstance(ciphertext)) {
                val msg = PreKeySignalMessage(ciphertext)
                sessionCipher.decrypt(msg)
            } else {
                val msg = CiphertextMessage(ciphertext)
                sessionCipher.decrypt(msg)
            }
        } catch (e: UntrustedIdentityException) {
            throw RuntimeException("Identità non attendibile: ${e.message}", e)
        }
    }
}
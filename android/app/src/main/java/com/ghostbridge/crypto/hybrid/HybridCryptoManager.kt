package com.ghostbridge.crypto.hybrid

import android.content.Context
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import com.ghostbridge.crypto.keys.Rsa2048KeyManager
import org.bouncycastle.crypto.digests.SHA256Digest
import org.bouncycastle.crypto.generators.KDF2BytesGenerator
import org.bouncycastle.jcajce.provider.BouncyCastleFipsProvider
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider
import org.bouncycastle.pqc.jcajce.spec.KyberParameterSpec
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.nio.charset.StandardCharsets
import java.security.*
import java.security.spec.MGF1ParameterSpec
import java.security.spec.OAEPParameterSpec
import java.security.spec.PSource
import javax.crypto.KeyGenerator
import javax.crypto.Mac

/**
 * HybridCryptoManager:
 * Feature 19 – "Cifratura Ibrida PQC+RSA": combina Kyber KEM (post-quantum) con RSA-2048 (classico)
 * per derivare una chiave simmetrica AES-256-GCM e cifrare un payload.
 *
 * - Usa BouncyCastle PQC per Kyber KEM (Kyber512), genera una shared secret PQC.
 * - Usa RSA-2048 OAEP per cifrare la stessa shared secret come fallback classico.
 * - Deriva la chiave AES finale concatenando e HMAC-SHA256 di entrambi i secret.
 * - Cifra il payload con AES-256-GCM.
 *
 * File: app/src/main/java/com/ghostbridge/crypto/hybrid/HybridCryptoManager.kt
 *
 * Dipendenze nel build.gradle (module):
 * implementation "org.bouncycastle:bcprov-jdk15to18:1.72"
 * implementation "org.bouncycastle:bcpqc-jdk15to18:1.72"
 */
object HybridCryptoManager {
    private const val TAG = "HybridCryptoManager"
    private const val AES_MODE = "AES/GCM/NoPadding"
    private const val RSA_ALGORITHM = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding"
    private const val GCM_TAG_LENGTH_BITS = 128
    private const val IV_SIZE_BYTES = 12
    private const val AES_KEY_SIZE = 32 // 256 bit

    init {
        // Registra i provider BouncyCastle se non già presenti
        if (Security.getProvider(BouncyCastlePQCProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastlePQCProvider())
        }
        if (Security.getProvider(BouncyCastleFipsProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleFipsProvider())
        }
    }

    /**
     * Data class per contenere il risultato dell'hybrid encrypt:
     * - kemEncapsulation: ByteArray della capsule PQC da trasmettere
     * - rsaEncryptedSecret: ByteArray del secret cifrato con RSA
     * - iv: IV usato da AES-256-GCM
     * - cipherText: ciphertext del payload (payload||tag)
     */
    data class HybridResult(
        val kemEncapsulation: ByteArray,
        val rsaEncryptedSecret: ByteArray,
        val iv: ByteArray,
        val cipherText: ByteArray
    )

    /**
     * Esegue la cifratura ibrida:
     * 1) Genera coppia chiavi PQC Kyber512 (in memoria).
     * 2) Esegue KEM: genera (kemEncapsulation, sharedSecretPQC).
     * 3) Cifra sharedSecretPQC con RSA-2048/OAEP usando la public key dell'utente.
     * 4) Deriva la chiave AES-256 finale: HKDF-SHA256(sharedSecretPQC || sharedSecretRSA).
     * 5) Cifra il payload con AES-256-GCM usando la chiave AES derivata.
     *
     * @param context  Context per recupero chiavi RSA dal KeyStore
     * @param userId   identificativo utente per RSA-2048
     * @param payload  ByteArray del messaggio da cifrare
     * @return HybridResult contenente kemEncapsulation, rsaEncryptedSecret, iv e cipherText
     * @throws Exception su qualsiasi errore crittografico
     */
    @Throws(Exception::class)
    fun encrypt(context: Context, userId: Int, payload: ByteArray): HybridResult {
        // 1) Genera coppia Kyber512 in memoria
        val kpg = KeyPairGenerator.getInstance("Kyber", BouncyCastlePQCProvider.PROVIDER_NAME)
        kpg.initialize(KyberParameterSpec.kyber512, SecureRandom())
        val kemKeyPair = kpg.generateKeyPair()

        // 2) KEM: genera kapsula e shared secret PQC
        val kemGen = org.bouncycastle.pqc.jcajce.spec.KEMGenerator(
            KDF2BytesGenerator(SHA256Digest())
        )
        val kemCipherTextAndSecret = kemGen.generateEncapsulated(kemKeyPair.public)
        val kemEncapsulation = kemCipherTextAndSecret.encapsulation
        val sharedSecretPQC = kemCipherTextAndSecret.secret // 32 byte per Kyber512

        // 3) Cifra sharedSecretPQC con RSA-2048 OAEP
        val rsaPubKeyBytes = Rsa2048KeyManager.getPublicKeyBytes(userId)
        val kf = KeyFactory.getInstance(KeyProperties.KEY_ALGORITHM_RSA)
        val pubSpec = java.security.spec.X509EncodedKeySpec(rsaPubKeyBytes)
        val rsaPublicKey = kf.generatePublic(pubSpec)
        val rsaCipher = Cipher.getInstance(RSA_ALGORITHM)
        // Imposta OAEPParameterSpec
        val oaepParams = OAEPParameterSpec(
            "SHA-256",
            "MGF1",
            MGF1ParameterSpec.SHA256,
            PSource.PSpecified.DEFAULT
        )
        rsaCipher.init(Cipher.ENCRYPT_MODE, rsaPublicKey, oaepParams)
        val rsaEncryptedSecret = rsaCipher.doFinal(sharedSecretPQC) // fallback classico

        // 4) Deriva chiave AES-256: HKDF-SHA256(sharedSecretPQC || sharedSecretRSA)
        val combinedSecret = sharedSecretPQC + rsaEncryptedSecret
        val aesKeyBytes = hkdfSha256(null, "GhostBridgeHybrid".toByteArray(StandardCharsets.UTF_8), combinedSecret, AES_KEY_SIZE)
        val aesKey = SecretKeySpec(aesKeyBytes, "AES")

        // 5) Cifra payload con AES-256-GCM
        val iv = ByteArray(IV_SIZE_BYTES).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance(AES_MODE)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.ENCRYPT_MODE, aesKey, spec)
        val cipherText = cipher.doFinal(payload) // payload||16-byte tag

        return HybridResult(
            kemEncapsulation = kemEncapsulation,
            rsaEncryptedSecret = rsaEncryptedSecret,
            iv = iv,
            cipherText = cipherText
        )
    }

    /**
     * Decripta il risultato dell'hybrid encrypt:
     * 1) Decifra sharedSecretPQC con KEMExtractor (chiave privata Kyber512).
     * 2) Decifra sharedSecretRSA con RSA-2048 OAEP (chiave privata dal KeyStore).
     * 3) Deriva la chiave AES-256: HKDF-SHA256(sharedSecretPQC || sharedSecretRSA).
     * 4) Decifra il payload con AES-256-GCM usando la chiave AES derivata.
     *
     * @param context           Context per recupero chiave RSA
     * @param userId            identificativo utente di destinazione
     * @param kemKeyPairPriv    PrivateKey Kyber512 in memoria (da passo 1)
     * @param kemEncapsulation  ByteArray ricevuto da encrypt()
     * @param rsaEncryptedSecret ByteArray ricevuto da encrypt()
     * @param iv                IV usato da AES-256-GCM
     * @param cipherText        ByteArray del payload cifrato (payload||tag)
     * @return ByteArray del payload originale in chiaro
     * @throws Exception su qualsiasi errore crittografico
     */
    @Throws(Exception::class)
    fun decrypt(
        context: Context,
        userId: Int,
        kemKeyPairPriv: PrivateKey,
        kemEncapsulation: ByteArray,
        rsaEncryptedSecret: ByteArray,
        iv: ByteArray,
        cipherText: ByteArray
    ): ByteArray {
        // 1) Decapsula sharedSecretPQC con KEMExtractor
        val kemExt = org.bouncycastle.pqc.jcajce.spec.KEMExtractor(
            kemKeyPairPriv,
            KDF2BytesGenerator(SHA256Digest())
        )
        val sharedSecretPQC = kemExt.extractSecret(kemEncapsulation) // 32 byte

        // 2) Decifra sharedSecretRSA con RSA-2048 OAEP
        val entry = Rsa2048KeyManager.getPrivateKeyEntry(userId)
        val rsaPrivKey = entry.privateKey
        val rsaCipher = Cipher.getInstance(RSA_ALGORITHM)
        val oaepParams = OAEPParameterSpec(
            "SHA-256",
            "MGF1",
            MGF1ParameterSpec.SHA256,
            PSource.PSpecified.DEFAULT
        )
        rsaCipher.init(Cipher.DECRYPT_MODE, rsaPrivKey, oaepParams)
        val sharedSecretRSA = rsaCipher.doFinal(rsaEncryptedSecret)

        // 3) Deriva chiave AES-256: HKDF-SHA256(sharedSecretPQC || sharedSecretRSA)
        val combinedSecret = sharedSecretPQC + sharedSecretRSA
        val aesKeyBytes = hkdfSha256(null, "GhostBridgeHybrid".toByteArray(StandardCharsets.UTF_8), combinedSecret, AES_KEY_SIZE)
        val aesKey = SecretKeySpec(aesKeyBytes, "AES")

        // 4) Decifra payload con AES-256-GCM
        val cipher = Cipher.getInstance(AES_MODE)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, aesKey, spec)
        return cipher.doFinal(cipherText)
    }

    /**
     * HKDF-SHA256 (RFC 5869) che ricava una chiave di lunghezza outLen da ikm.
     * @param salt opzionale, se null usa zero-filled di lunghezza HMAC
     * @param info contesto per derivazione
     * @param ikm input key material (combined secret)
     * @param outLen lunghezza output in byte
     */
    private fun hkdfSha256(salt: ByteArray?, info: ByteArray?, ikm: ByteArray, outLen: Int): ByteArray {
        val hLen = 32
        val actualSalt = salt ?: ByteArray(hLen) { 0 }
        // Extract
        val macExtract = Mac.getInstance("HmacSHA256")
        macExtract.init(SecretKeySpec(actualSalt, "HmacSHA256"))
        val prk = macExtract.doFinal(ikm)
        // Expand
        val okm = ByteArray(outLen)
        var prev = ByteArray(0)
        var generated = 0
        var counter: Byte = 1
        while (generated < outLen) {
            val macExpand = Mac.getInstance("HmacSHA256")
            macExpand.init(SecretKeySpec(prk, "HmacSHA256"))
            macExpand.update(prev)
            info?.let { macExpand.update(it) }
            macExpand.update(counter)
            val t = macExpand.doFinal()
            val toCopy = minOf(t.size, outLen - generated)
            System.arraycopy(t, 0, okm, generated, toCopy)
            generated += toCopy
            prev = t
            counter++
        }
        return okm
    }
}
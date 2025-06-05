package com.ghostbridge.crypto.jwt

import android.content.Context
import android.security.keystore.KeyProperties
import android.util.Base64
import com.auth0.android.jwt.JWT
import com.auth0.jwt.JWTSigner
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import com.ghostbridge.crypto.keys.Rsa2048KeyManager
import java.security.KeyFactory
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.spec.X509EncodedKeySpec
import java.util.Date

/**
 * JwtManager:
 * Gestisce la generazione e verifica di JSON Web Token (JWT) firmati con RSA-2048 (RS256).
 *
 * File: app/src/main/java/com/ghostbridge/crypto/jwt/JwtManager.kt
 *
 * Dipendenza necessaria (app/build.gradle):
 * implementation "com.auth0.android:jwtdecode:2.0.1"
 * implementation "com.auth0:java-jwt:4.4.0"
 */
object JwtManager {
    private const val TAG = "JwtManager"
    private const val KEYSTORE = "AndroidKeyStore"
    private const val RSA_KEY_PREFIX = "RSA2048_KEY_USER_"
    private const val ISSUER = "GhostBridge"
    private const val EXPIRATION_MS = 24 * 60 * 60 * 1000L  // 24 ore

    /**
     * Genera un JWT per userId con claims personalizzati.
     * @param userId    identificativo dell'utente (presente in KeyStore)
     * @param subject   soggetto del token (tipicamente userId o username)
     * @param customClaims mappa di claims aggiuntivi (String -> Any)
     * @return token JWT firmato (String)
     */
    @Throws(Exception::class)
    fun generateToken(
        userId: Int,
        subject: String,
        customClaims: Map<String, Any> = emptyMap()
    ): String {
        // 1) Assicuriamoci che la chiave RSA-2048 esista
        Rsa2048KeyManager.generateKeyIfNecessary(null, userId)  // context non usato qui
        // 2) Recupera la PrivateKeyEntry
        val entry = Rsa2048KeyManager.getPrivateKeyEntry(userId)
        val privateKey = entry.privateKey as PrivateKey

        // 3) Costruisci l'algoritmo RS256 con la PrivateKey
        val algorithm = Algorithm.RSA256(null, privateKey)

        // 4) Calcola tempi
        val now = Date()
        val exp = Date(now.time + EXPIRATION_MS)

        // 5) Costruisci il token
        val signer = JWTSigner(algorithm)
        val claims = HashMap<String, Any>()
        claims["iss"] = ISSUER
        claims["sub"] = subject
        claims["iat"] = now.time / 1000
        claims["exp"] = exp.time / 1000
        // Aggiunge i custom claims
        for ((k, v) in customClaims) {
            claims[k] = v
        }

        return signer.sign(claims)
    }

    /**
     * Verifica un JWT firmato RS256.
     * @param userId    identificativo dell'utente (pubKey nel KeyStore)
     * @param token     token JWT da verificare
     * @return true se valida (firma corretta, issuer, exp), false altrimenti
     */
    @Throws(Exception::class)
    fun verifyToken(userId: Int, token: String): Boolean {
        // 1) Ottieni public key X.509 dal KeyStore
        val pubKeyBytes = Rsa2048KeyManager.getPublicKeyBytes(userId)
        val keyFactory = KeyFactory.getInstance("RSA")
        val pubKeySpec = X509EncodedKeySpec(pubKeyBytes)
        val publicKey = keyFactory.generatePublic(pubKeySpec) as PublicKey

        // 2) Configura Algorithm per la verifica
        val algorithm = Algorithm.RSA256(publicKey, null)
        val verifier = JWTVerifier(algorithm)

        // 3) Decodifica e verifica
        return try {
            val decoded = verifier.verify(token)
            // Controlla issuer e scadenza
            val iss = decoded.getClaim("iss").asString()
            if (iss != ISSUER) return false
            val exp = decoded.expiresAt.time
            if (Date().time / 1000 > exp / 1000) return false
            true
        } catch (e: Exception) {
            Log.e(TAG, "JWT verification failed: ${e.message}")
            false
        }
    }

    /**
     * Estrae i claims da un token JWT (senza verificarlo).
     * @param token JWT da decodificare
     * @return oggetto com.auth0.android.jwt.JWT per leggere i claims
     */
    fun decodeToken(token: String): JWT {
        return JWT(token)
    }
}
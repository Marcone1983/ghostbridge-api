#include <jni.h>
#include <android/log.h>
#include <openssl/sha.h>
#include <stdlib.h>
#include <string.h>
#include <mutex>

#define LOG_TAG "MemTamperNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Dimensione della regione protetta (4 KB)
static const size_t REGION_SIZE = 4096;

// Puntatore alla regione protetta
static unsigned char* protected_region = nullptr;
// Hash SHA-256 iniziale (32 byte)
static unsigned char initial_hash[SHA256_DIGEST_LENGTH];
// Mutex per rendere le operazioni thread-safe
static std::mutex region_mutex;

extern "C" {

/**
 * nativeInitializeRegion:
 * - Alloca REGION_SIZE byte con malloc, riempie con valori pseudo‐casuali.
 * - Calcola SHA-256 su protected_region, salva in initial_hash.
 * - Restituisce JNI_TRUE se tutto OK, JNI_FALSE altrimenti.
 */
JNIEXPORT jboolean JNICALL
Java_com_ghostbridge_security_MemoryTamperingDetector_nativeInitializeRegion(
        JNIEnv* env, jclass /* clazz */) {
    std::lock_guard<std::mutex> lock(region_mutex);

    if (protected_region != nullptr) {
        LOGE("Regione già inizializzata");
        return JNI_FALSE;
    }

    // Alloca la regione
    protected_region = (unsigned char*) malloc(REGION_SIZE);
    if (protected_region == nullptr) {
        LOGE("malloc fallito per protected_region");
        return JNI_FALSE;
    }

    // Riempie con valori pseudo‐casuali (per test è sufficiente rand; in produzione usare /dev/urandom)
    FILE* urandom = fopen("/dev/urandom", "rb");
    if (urandom) {
        fread(protected_region, 1, REGION_SIZE, urandom);
        fclose(urandom);
    } else {
        // Fallback con rand()
        for (size_t i = 0; i < REGION_SIZE; i++) {
            protected_region[i] = static_cast<unsigned char>(rand() % 256);
        }
    }

    // Calcola hash SHA-256 iniziale
    SHA256_CTX sha_ctx;
    SHA256_Init(&sha_ctx);
    SHA256_Update(&sha_ctx, protected_region, REGION_SIZE);
    SHA256_Final(initial_hash, &sha_ctx);

    LOGI("Protected region inizializzata e hash salvato");
    return JNI_TRUE;
}

/**
 * nativeCheckRegionIntegrity:
 * - Ricalcola SHA-256 su protected_region, confronta con initial_hash.
 * - Restituisce JNI_TRUE se identico, JNI_FALSE se differente o errori.
 */
JNIEXPORT jboolean JNICALL
Java_com_ghostbridge_security_MemoryTamperingDetector_nativeCheckRegionIntegrity(
        JNIEnv* env, jclass /* clazz */) {
    std::lock_guard<std::mutex> lock(region_mutex);

    if (protected_region == nullptr) {
        LOGE("Regione non inizializzata");
        return JNI_FALSE;
    }

    unsigned char current_hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha_ctx;
    SHA256_Init(&sha_ctx);
    SHA256_Update(&sha_ctx, protected_region, REGION_SIZE);
    SHA256_Final(current_hash, &sha_ctx);

    // Confronta byte a byte
    if (memcmp(initial_hash, current_hash, SHA256_DIGEST_LENGTH) != 0) {
        LOGE("Hash mismatch: integrità regione violata");
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

/**
 * nativeCleanupRegion:
 * - Sovrascrive protected_region con zeri, quindi libera la memoria.
 * - Azera initial_hash per sicurezza.
 */
JNIEXPORT void JNICALL
Java_com_ghostbridge_security_MemoryTamperingDetector_nativeCleanupRegion(
        JNIEnv* env, jclass /* clazz */) {
    std::lock_guard<std::mutex> lock(region_mutex);

    if (protected_region) {
        // Sovrascrivi con zero
        memset(protected_region, 0, REGION_SIZE);
        free(protected_region);
        protected_region = nullptr;
        LOGI("Protected region sovrascritta e liberata");
    }
    // Azzera hash iniziale
    memset(initial_hash, 0, SHA256_DIGEST_LENGTH);
    LOGI("Initial hash azzerato");
}
}  // extern "C"